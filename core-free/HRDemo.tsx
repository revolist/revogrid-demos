import './hr-demo.css';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RevoGrid, BasePlugin, type PluginProviders } from '@revolist/react-datagrid';
import { getHRColumnsCount, getHRData, HR_OPTIONS } from '../sys-data/hr.data';
import type { HRGenerationProgress } from '../sys-data/hr.data.generator';
import { getBaseHRColumns, getExtraHRColumns, HR_COLOR_BY_AGE } from '../sys-data/hr.columns';
import { createHRColorSelectColumnType, renderHrColorPill } from './hr-color-select';
import { getHRLoadingDigits, getHRProgressPercent } from './hr-loading';
import DateCol from '@revolist/revogrid-column-date';
import NumeralCol from '@revolist/revogrid-column-numeral';
import SelectCol from '@revolist/revogrid-column-select';

interface HRDemoProps {
  isDark?: boolean;
}

export const HRDemo: React.FC<HRDemoProps> = ({ isDark }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentSize, setCurrentSize] = useState(100);
  const [columnTypes, setColumnTypes] = useState<any>({});
  const [progress, setProgress] = useState<HRGenerationProgress>({ loaded: 0, total: 100 });
  const activeController = useRef<AbortController | null>(null);

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
    setProgress({ loaded: 0, total: size });
    try {
      const data = await getHRData(size, getHRColumnsCount(size), {
        signal: controller.signal,
        onProgress: setProgress,
      });
      setRows(data);
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
    const init = () => {
      setColumnTypes({
        date: new DateCol(),
        number: new NumeralCol(),
        select: new SelectCol(),
        colorSelect: createHRColorSelectColumnType(SelectCol)
      });
      
      loadData(currentSize);
    };
    init();
    return () => {
      activeController.current?.abort();
    };
  }, []);

  const columns = useMemo(() => {
    const dropdownSource = Array.from(new Set(rows.map(r => r.company))).filter(Boolean) as string[];
    const baseCols = getBaseHRColumns(dropdownSource);

    // RevoGrid cell templates must return Stencil/RevoGrid VNodes via `h`.
    const nameCol = (baseCols[0] as any).children[1];
    nameCol.cellTemplate = (h: any, props: any) =>
      h('div', { class: 'flex items-center' }, [
        h('div', { class: 'hr-avatar' }, [
          h('img', {
            src: props.model.avatar,
            alt: props.value,
            class: 'w-full h-full object-cover',
          }),
        ]),
        props.value,
      ]);

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

    return [...baseCols, ...getExtraHRColumns(getHRColumnsCount(currentSize))];
  }, [rows, currentSize]);

  const onSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSize = parseInt(e.target.value, 10);
    setCurrentSize(nextSize);
    loadData(nextSize);
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
        {loading && <div className="text-sm opacity-50 animate-pulse ml-2">Loading data...</div>}
      </div>

      <div className="hr-grid-wrapper flex-1 min-h-0">
        <RevoGrid
          className="hr-scale-grid grow h-full w-full"
          style={{ height: '100%', width: '100%' }}
          theme={isDark ? 'darkMaterial' : 'compact'}
          source={rows}
          columns={columns}
          columnTypes={columnTypes}
          plugins={plugins}
          filter={true}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default HRDemo;
