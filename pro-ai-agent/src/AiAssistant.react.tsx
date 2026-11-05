/** @jsxImportSource react */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import {
  attachAiAssistantResize,
  createAiDemoViewSwitcher,
  mountAiDemoViewControls,
  aiDemoCharts,
  aiDemoColumnTypes,
  aiDemoFilter,
  aiViewColumns,
  aiViewPlugins,
  aiDemoFormulaNames,
  createAiViewRows,
  createAiAssistantDemoConfig,
} from './AiAssistant.shared';
import './ai-assistant.scss';
export default function AiAssistant({
  isDark,
  endpoint,
  rowsEndpoint,
}: {
  rows?: any[];
  isDark?: boolean;
  endpoint?: string;
  rowsEndpoint?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const resizeHandle = useRef<HTMLDivElement>(null);
  useEffect(
    () => attachAiAssistantResize(container.current!, resizeHandle.current!),
    [],
  );
  const grid = useRef<HTMLRevoGridElement | undefined>(undefined);
  const viewControls = useRef<HTMLDivElement>(null);
  const [gridSurface, setGridSurface] = useState<HTMLElement | null>(null);
  const [chartSurface, setChartSurface] = useState<HTMLElement | null>(null);
  const views = useMemo(() => !rowsEndpoint && gridSurface && chartSurface
    ? createAiDemoViewSwitcher(gridSurface, chartSurface) : undefined, [rowsEndpoint, gridSurface, chartSurface]);
  const [controlsHost, setControlsHost] = useState<HTMLElement | null>(null);
  const [assistantHost, setAssistantHost] = useState<HTMLElement | null>(null);
  const columnTypes = useMemo(() => aiDemoColumnTypes, []);
  const plugins = useMemo(() => [...aiViewPlugins], []);
  const [source, setSource] = useState(() =>
    rowsEndpoint ? [] : createAiViewRows(),
  );
  const columns = useMemo(
    () =>
      rowsEndpoint
        ? aiViewColumns.map((column) => ({
            ...column,
            filter: false,
            sortable: false,
          }))
        : aiViewColumns,
    [rowsEndpoint],
  );
  const config = useMemo(
    () =>
      createAiAssistantDemoConfig(
        endpoint,
        rowsEndpoint ? { rowsEndpoint, onRows: setSource } : undefined,
        () => grid.current,
        assistantHost ?? undefined,
        controlsHost ?? undefined,
      ),
    [endpoint, rowsEndpoint, assistantHost, controlsHost],
  );
  return (
    <div ref={container} className="ai-view-demo">
      <div className="ai-view-demo__grid">
        <div className="ai-view-demo__toolbar" role="toolbar" aria-label="Grid controls">
          <div ref={setControlsHost} />
          <div ref={viewControls} />
        </div>
        <div ref={setChartSurface} className="ai-view-demo__chart" hidden />
        <div ref={setGridSurface} className="ai-view-demo__surface">
        {assistantHost && controlsHost && gridSurface && chartSurface && (
          <RevoGrid
            onAftergridinit={(event) => {
              grid.current = event.target as HTMLRevoGridElement;
              grid.current.pivotCharts = aiDemoCharts;
              grid.current.formulaNames = aiDemoFormulaNames;
              if (!rowsEndpoint) void mountAiDemoViewControls(grid.current, viewControls.current!);
            }}
            source={source}
            columns={columns}
            plugins={plugins}
            columnTypes={columnTypes}
            stretch="all"
            aiAssistant={config}
            viewSwitcher={views}
            filter={rowsEndpoint ? true : aiDemoFilter}
            theme={isDark ? 'darkCompact' : 'compact'}
            hideAttribution={true}
          />
        )}
        </div>
      </div>
      <div
        ref={resizeHandle}
        className="rv-resize-handle ai-view-demo__resize"
      />
      <aside
        ref={setAssistantHost}
        className="ai-view-demo__assistant"
        aria-label="AI assistant"
      />
    </div>
  );
}
