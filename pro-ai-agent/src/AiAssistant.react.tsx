/** @jsxImportSource react */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import {
  attachAiAssistantResize,
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
  const [controlsHost, setControlsHost] = useState<HTMLElement | null>(null);
  const [assistantHost, setAssistantHost] = useState<HTMLElement | null>(null);
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
        <div
          ref={setControlsHost}
          className="ai-view-demo__toolbar"
          role="toolbar"
          aria-label="Grid controls"
        />
        {assistantHost && controlsHost && (
          <RevoGrid
            onAftergridinit={(event) => {
              grid.current = event.target as HTMLRevoGridElement;
            }}
            source={source}
            columns={columns}
            plugins={plugins}
            aiAssistant={config}
            formulaNames={aiDemoFormulaNames}
            filter={true}
            theme={isDark ? 'darkCompact' : 'compact'}
            hideAttribution={true}
          />
        )}
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
