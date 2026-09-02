import './hr.css';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RevoGrid, BasePlugin, type PluginProviders } from '@revolist/react-datagrid';
import { getHRColumnsCount, getHRData, getHRVisibleColumnsCount, HR_COMPANY_OPTIONS, HR_OPTIONS } from './sys-data/hr.data';
import type { HRGenerationProgress } from './sys-data/hr.data.generator';
import { getBaseHRColumns, getExtraHRColumns, HR_COLOR_BY_AGE, withHRShortDate } from './sys-data/hr.columns';
import { renderHrColorPill } from './hr-color-select';
import { renderHrCompanyCell } from './hr-company-avatar';
import { getHRLoadingDigits, getHRProgressPercent } from './hr-loading';
import { getInitialHRTheme, HR_THEME_DEFINITIONS, HR_THEME_OPTIONS } from './hr-themes';
import DateCol from '@revolist/revogrid-column-date';
import NumeralCol from '@revolist/revogrid-column-numeral';
import SelectCol from '@revolist/revogrid-column-select';
import {
  createHRPerformanceMonitor,
  createInitialHRPerformanceState,
  formatDuration,
  formatFrameRate,
  formatMemory,
  getHRMetricTooltipId,
  HR_PERFORMANCE_METRICS,
  type HRPerformanceMetricKey,
  type HRPerformanceMonitor,
} from './hr-performance';
import {
  applyHRWorkspaceToColumns,
  createHRWorkspaceController,
  getHRWorkspaceRowCount,
  HR_DEFAULT_ROW_COUNT,
  loadHRWorkspace,
  type HRWorkspaceController,
  type HRWorkspaceState,
} from './hr-workspace';

interface HRDemoProps {
  isDark?: boolean;
}

function HRMetricLabel({ metric }: { metric: HRPerformanceMetricKey }) {
  const definition = HR_PERFORMANCE_METRICS[metric];
  const tooltipId = getHRMetricTooltipId(metric);
  return (
    <div className="hr-performance-label">
      <span>{definition.label}</span>
      <span className="hr-metric-help">
        <button
          type="button"
          className="hr-metric-help-trigger"
          aria-label={`About ${definition.label}`}
          aria-describedby={tooltipId}
        >?</button>
        <span className="hr-metric-tooltip" id={tooltipId} role="tooltip">{definition.description}</span>
      </span>
    </div>
  );
}

export const HRDemo: React.FC<HRDemoProps> = ({ isDark }) => {
  const [workspaceState, setWorkspaceState] = useState<HRWorkspaceState>(() => loadHRWorkspace());
  const [workspaceStatus, setWorkspaceStatus] = useState(() => Object.keys(loadHRWorkspace()).length ? 'Saved locally' : 'View not saved');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Preparing rows…');
  const [currentSize, setCurrentSize] = useState(() => getHRWorkspaceRowCount(loadHRWorkspace(), HR_OPTIONS.map(option => option.value)));
  const [selectedTheme, setSelectedTheme] = useState(() => {
    const saved = loadHRWorkspace().theme;
    return HR_THEME_OPTIONS.some(option => option.value === saved) ? saved! : getInitialHRTheme(isDark);
  });
  const [columnTypes, setColumnTypes] = useState<any>({});
  const [progress, setProgress] = useState<HRGenerationProgress>({ loaded: 0, total: 100 });
  const [performanceState, setPerformanceState] = useState(createInitialHRPerformanceState);
  const activeController = useRef<AbortController | null>(null);
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const performanceMonitor = useRef<HRPerformanceMonitor | null>(null);
  const workspaceController = useRef<HRWorkspaceController | null>(null);

  const plugins = useMemo(() => [
    class HRPlugin extends BasePlugin {
      constructor(r: HTMLRevoGridElement, p: PluginProviders) {
        super(r, p);
        this.addEventListener('rowdragstart', (e) => {
          if (e.detail.model) {
            e.detail.text = e.detail.model['name'];
          }
        });
      }
    },
  ], []);
  
  const loadData = async (size: number) => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setLoading(true);
    setLoadingLabel(`Preparing ${size.toLocaleString()} rows…`);
    setProgress({ loaded: 0, total: size });
    const preparationStartedAt = performance.now();
    try {
      const data = await getHRData(size, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      performanceMonitor.current?.setPreparationResult(
        performance.now() - preparationStartedAt,
        size,
        getHRVisibleColumnsCount(size),
      );
      setLoadingLabel('Rendering RevoGrid…');
      if (performanceMonitor.current) {
        await performanceMonitor.current.measureGridUpdate(() => setRows(data));
      } else {
        setRows(data);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }
    } finally {
      if (activeController.current === controller) {
        setLoading(false);
        activeController.current = null;
      }
    }
  };

  useEffect(() => {
    if (gridRef.current) {
      performanceMonitor.current = createHRPerformanceMonitor(gridRef.current, setPerformanceState);
      workspaceController.current = createHRWorkspaceController(
        gridRef.current,
        workspaceState,
        () => setWorkspaceStatus('Unsaved changes'),
      );
    }
    const init = () => {
      setColumnTypes({
        date: withHRShortDate(new DateCol()),
        number: new NumeralCol(),
        select: new SelectCol(),
        colorSelect: new SelectCol()
      });
      
      loadData(currentSize);
    };
    init();
    return () => {
      activeController.current?.abort();
      performanceMonitor.current?.destroy();
      performanceMonitor.current = null;
      workspaceController.current?.destroy();
      workspaceController.current = null;
    };
  }, []);

  useEffect(() => {
    if (!workspaceState.theme) {
      setSelectedTheme(getInitialHRTheme(isDark));
    }
  }, [isDark, workspaceState.theme]);

  const columns = useMemo(() => {
    const baseCols = getBaseHRColumns(HR_COMPANY_OPTIONS);

    // RevoGrid cell templates must return Stencil/RevoGrid VNodes via `h`.
    const companyCol = (baseCols[0] as any).children[1];
    companyCol.cellTemplate = renderHrCompanyCell;

    const personalGroup = baseCols[1] as any;
    const ageCol = personalGroup.children[0];
    ageCol.cellTemplate = (h: any, props: any) => [
      h('i', {
        class: 'hr-circle',
        style: { borderColor: HR_COLOR_BY_AGE(props.value) },
      }),
      props.value,
    ];

    const eyesCol = personalGroup.children[2];
    eyesCol.cellTemplate = (h: any, props: any) =>
      renderHrColorPill(h, props.value);

    return applyHRWorkspaceToColumns(
      [...baseCols, ...getExtraHRColumns(getHRColumnsCount(currentSize))],
      workspaceState,
    );
  }, [currentSize, workspaceState]);

  const onSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSize = parseInt(e.target.value, 10);
    setCurrentSize(nextSize);
    setWorkspaceStatus('Unsaved changes');
    loadData(nextSize);
  };

  const saveView = async () => {
    if (!workspaceController.current) return;
    const saved = await workspaceController.current.save({ rowCount: currentSize, theme: selectedTheme });
    setWorkspaceState(saved);
    setWorkspaceStatus('Saved locally');
  };

  const resetView = () => {
    workspaceController.current?.clear();
    setWorkspaceState({ filter: { collection: {} } });
    setCurrentSize(HR_DEFAULT_ROW_COUNT);
    setSelectedTheme(getInitialHRTheme(isDark));
    setWorkspaceStatus('View reset');
    loadData(HR_DEFAULT_ROW_COUNT);
  };

  const progressPercent = getHRProgressPercent(progress);
  const loadingDigits = getHRLoadingDigits(progress);

  return (
    <div className="hr-demo grow h-full flex flex-col">
      <div className="hr-toolbar">
        <span className="text-sm font-medium">Data Source</span>
        <select
          className="hr-select"
          value={currentSize}
          onChange={onSizeChange}
          disabled={loading}
        >
          {HR_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-sm font-medium">Theme</span>
        <select
          className="hr-select"
          value={selectedTheme}
          onChange={event => {
            setSelectedTheme(event.target.value);
            setWorkspaceStatus('Unsaved changes');
          }}
        >
          {HR_THEME_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="button" className="hr-button" onClick={saveView}>Save view</button>
        <button type="button" className="hr-button hr-button-secondary" onClick={resetView}>Reset view</button>
        <span className="hr-workspace-status">{workspaceStatus}</span>
        {loading && <div className="text-sm opacity-50 animate-pulse ml-2">{loadingLabel}</div>}
      </div>

      <div className="hr-grid-wrapper flex-1 min-h-0">
        <RevoGrid
          ref={gridRef}
          className="hr-scale-grid grow h-full w-full"
          style={{ height: '100%', width: '100%' }}
          theme={selectedTheme}
          themeDefinitions={HR_THEME_DEFINITIONS}
          source={rows}
          columns={columns}
          columnTypes={columnTypes}
          plugins={plugins}
          filter={workspaceState.filter ?? true}
          sorting={workspaceState.sorting}
          range={true}
          resize={true}
          rowHeaders={true}
          hideAttribution={true}
          canMoveColumns={true}
          rowSize={36}
        />
        {loading && (
          <div className="hr-loading-overlay" aria-live="polite">
            <div className="hr-loading-counter" aria-label={`${progressPercent} percent complete`}>
              <div className="hr-loading-counter-line">
                {loadingDigits.map((digit, index) => (
                  <span
                    key={`${digit}-${index}-${progressPercent}`}
                    className="hr-loading-counter-digit"
                  >
                    {digit}
                  </span>
                ))}
                <span className="hr-loading-counter-symbol">%</span>
              </div>
            </div>
            <div className="hr-loading-label">{loadingLabel}</div>
          </div>
        )}
      </div>

      <section className="hr-performance" aria-label="Browser performance metrics">
        <div className="hr-performance-heading">
          <strong>Performance</strong>
          <span>Measured live in this browser</span>
        </div>
        <div className="hr-performance-metric">
          <HRMetricLabel metric="preparation" />
          <strong>{formatDuration(performanceState.preparationTime)}</strong>
        </div>
        <div className="hr-performance-metric">
          <HRMetricLabel metric="grid" />
          <strong>{formatDuration(performanceState.gridRenderTime)}</strong>
        </div>
        <div className="hr-performance-metric">
          <HRMetricLabel metric="scroll" />
          <strong>{formatFrameRate(performanceState.scrollFps)}</strong>
        </div>
        <div className="hr-performance-metric">
          <HRMetricLabel metric="memory" />
          <strong>{formatMemory(performanceState.memoryUsage?.usedJSHeapSize)}</strong>
        </div>
        <div className="hr-performance-metric">
          <HRMetricLabel metric="dataset" />
          <strong>{performanceState.rowCount.toLocaleString()} × {performanceState.columnCount}</strong>
        </div>
      </section>
    </div>
  );
};

export default HRDemo;
