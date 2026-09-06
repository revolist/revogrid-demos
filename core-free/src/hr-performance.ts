export interface HRMemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
}

export interface HRPerformanceState {
  preparationTime: number | null;
  gridRenderTime: number | null;
  scrollFps: number | null;
  memoryUsage: HRMemoryUsage | null;
  rowCount: number;
  columnCount: number;
}

export interface HRPerformanceMonitor {
  setPreparationResult(duration: number, rowCount: number, columnCount: number): void;
  measureGridUpdate(applyUpdate: () => void): Promise<number | null>;
  destroy(): void;
}

export const HR_PERFORMANCE_METRICS = {
  preparation: {
    label: 'Data preparation',
    description: 'Time spent creating or retrieving the selected row array before assigning it to RevoGrid. Lower is faster. This does not include grid rendering.',
  },
  grid: {
    label: 'Grid apply to paint',
    description: 'Time from assigning the new source and columns until RevoGrid finishes rendering and the browser reaches the next animation frame. Lower means the update became visible sooner.',
  },
  scroll: {
    label: 'Scroll FPS',
    description: 'Animation frames delivered during a sufficiently long, active grid viewport scroll. The maximum depends on the display refresh rate and browser; lower values are reported as measured and can indicate delayed or dropped frames. Results depend on the device and page workload.',
  },
  memory: {
    label: 'Page JS heap',
    description: 'JavaScript heap currently used by the entire page, sampled about once per second while the tab is visible from Chromium performance.memory. It is not RevoGrid-only and displays N/A when the browser does not expose this API.',
  },
  dataset: {
    label: 'Dataset',
    description: 'Requested rows multiplied by visible data columns; row headers are excluded. This describes the data workload, not the number of DOM cells, because RevoGrid virtualizes rendering.',
  },
} as const;

export type HRPerformanceMetricKey = keyof typeof HR_PERFORMANCE_METRICS;

export function getHRMetricTooltipId(metric: HRPerformanceMetricKey) {
  return `hr-metric-${metric}-tooltip`;
}

export function createInitialHRPerformanceState(): HRPerformanceState {
  return {
    preparationTime: null,
    gridRenderTime: null,
    scrollFps: null,
    memoryUsage: readPageMemory(),
    rowCount: 0,
    columnCount: 0,
  };
}

const SCROLL_IDLE_MS = 180;
const MIN_SCROLL_SAMPLE_MS = 250;
const FPS_PUBLISH_INTERVAL_MS = 500;
const GRID_RENDER_TIMEOUT_MS = 10_000;
const MEMORY_POLL_INTERVAL_MS = 1_000;

export function calculateFrameRate(timestamps: number[]) {
  if (timestamps.length < 2) return null;
  const duration = timestamps[timestamps.length - 1] - timestamps[0];
  return duration > 0 ? ((timestamps.length - 1) * 1_000) / duration : null;
}

export function formatDuration(duration: number | null) {
  return duration === null ? 'N/A' : `${duration.toFixed(1)} ms`;
}

export function formatFrameRate(fps: number | null) {
  return fps === null ? 'Scroll to measure' : `${Math.round(fps)} FPS`;
}

export function formatMemory(bytes: number | undefined) {
  return bytes === undefined ? 'N/A' : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function readPageMemory(): HRMemoryUsage | null {
  const memory = (performance as Performance & {
    memory?: HRMemoryUsage;
  }).memory;
  return memory
    ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
      }
    : null;
}

export function createHRPerformanceMonitor(
  grid: HTMLRevoGridElement,
  onChange: (state: HRPerformanceState) => void,
): HRPerformanceMonitor {
  const state = createInitialHRPerformanceState();
  let destroyed = false;
  let scrollActive = false;
  let lastScrollAt = 0;
  let frameTimestamps: number[] = [];
  let lastFpsPublishedAt = 0;
  let scrollFrame = 0;
  let memoryTimer = 0;
  let cancelGridMeasurement: (() => void) | undefined;

  const notify = () => {
    if (!destroyed) onChange({ ...state });
  };

  const publishFrameRate = () => {
    if (frameTimestamps.length < 2) return false;
    const duration = frameTimestamps.at(-1)! - frameTimestamps[0];
    if (duration < MIN_SCROLL_SAMPLE_MS) return false;
    const fps = calculateFrameRate(frameTimestamps);
    if (fps !== null) {
      state.scrollFps = fps;
      notify();
      return true;
    }
    return false;
  };

  const stopScrollSampling = () => {
    scrollActive = false;
    frameTimestamps = [];
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  };

  const sampleScrollFrames = (timestamp: number) => {
    if (!scrollActive || destroyed || document.visibilityState !== 'visible') return;
    if (performance.now() - lastScrollAt >= SCROLL_IDLE_MS) {
      publishFrameRate();
      stopScrollSampling();
      return;
    }
    frameTimestamps.push(timestamp);

    if (timestamp - lastFpsPublishedAt >= FPS_PUBLISH_INTERVAL_MS) {
      publishFrameRate();
      frameTimestamps = [timestamp];
      lastFpsPublishedAt = timestamp;
    }
    scrollFrame = requestAnimationFrame(sampleScrollFrames);
  };

  const onViewportScroll = () => {
    if (destroyed || document.visibilityState !== 'visible') return;
    lastScrollAt = performance.now();
    if (scrollActive) return;
    scrollActive = true;
    frameTimestamps = [];
    lastFpsPublishedAt = lastScrollAt;
    scrollFrame = requestAnimationFrame(sampleScrollFrames);
  };

  const stopMemoryPolling = () => {
    if (!memoryTimer) return;
    window.clearInterval(memoryTimer);
    memoryTimer = 0;
  };

  const sampleMemory = () => {
    const memory = readPageMemory();
    if (!memory) return false;
    state.memoryUsage = memory;
    notify();
    return true;
  };

  const startMemoryPolling = (publishImmediateSample = true) => {
    stopMemoryPolling();
    if (destroyed || document.visibilityState !== 'visible') return;
    const supported = publishImmediateSample ? sampleMemory() : state.memoryUsage !== null;
    if (!supported) return;
    memoryTimer = window.setInterval(sampleMemory, MEMORY_POLL_INTERVAL_MS);
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      startMemoryPolling();
    } else {
      stopMemoryPolling();
      stopScrollSampling();
    }
  };

  grid.addEventListener('viewportscroll', onViewportScroll);
  document.addEventListener('visibilitychange', onVisibilityChange);
  startMemoryPolling(false);
  notify();

  return {
    setPreparationResult(duration, rowCount, columnCount) {
      state.preparationTime = duration;
      state.rowCount = rowCount;
      state.columnCount = columnCount;
      notify();
    },

    measureGridUpdate(applyUpdate) {
      cancelGridMeasurement?.();
      const startedAt = performance.now();

      return new Promise<number | null>((resolve, reject) => {
        let finished = false;
        let paintFrame = 0;
        const timeout = window.setTimeout(() => finish(null), GRID_RENDER_TIMEOUT_MS);

        const cleanup = () => {
          grid.removeEventListener('aftergridrender', onGridRender);
          window.clearTimeout(timeout);
          if (paintFrame) cancelAnimationFrame(paintFrame);
          if (cancelGridMeasurement === cancel) cancelGridMeasurement = undefined;
        };
        const finish = (duration: number | null) => {
          if (finished) return;
          finished = true;
          cleanup();
          if (duration !== null) {
            state.gridRenderTime = duration;
            state.memoryUsage = readPageMemory();
            notify();
          }
          resolve(duration);
        };
        const cancel = () => finish(null);
        const onGridRender = () => {
          grid.removeEventListener('aftergridrender', onGridRender);
          paintFrame = requestAnimationFrame(() => finish(performance.now() - startedAt));
        };

        cancelGridMeasurement = cancel;
        grid.addEventListener('aftergridrender', onGridRender);
        try {
          applyUpdate();
        } catch (error) {
          cleanup();
          reject(error);
        }
      });
    },

    destroy() {
      destroyed = true;
      cancelGridMeasurement?.();
      grid.removeEventListener('viewportscroll', onViewportScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stopMemoryPolling();
      stopScrollSampling();
    },
  };
}
