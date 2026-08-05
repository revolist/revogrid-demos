import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MultiFilterItem } from '@revolist/revogrid';
import { RevoGrid } from '@revolist/react-datagrid';
import { currentTheme } from '../../composables/useRandomData';
import {
  createOrderExplorerColumns,
  createOrderExplorerColumnTypes,
  createOrderExplorerFilter,
  createOrderExplorerInitialFilters,
  createOrderExplorerPreset,
  createOrderExplorerRows,
  getOrderExplorerVisibleCount,
  mountOrderExplorerFilterBadges,
  orderExplorerPlugins,
  type OrderExplorerPreset,
  type OrderExplorerRow,
} from './filtering.shared';
import './filtering.scss';

export default function Filtering({ rows }: { rows?: OrderExplorerRow[] }) {
  const { isDark } = currentTheme();
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const source = useMemo(() => rows?.length ? rows : createOrderExplorerRows(), [rows]);
  const columns = useMemo(() => createOrderExplorerColumns(), []);
  const plugins = useMemo(() => [...orderExplorerPlugins], []);
  const columnTypes = useMemo(() => createOrderExplorerColumnTypes(), []);
  const [filter, setFilter] = useState(() => createOrderExplorerFilter(createOrderExplorerInitialFilters()));
  const [visibleCount, setVisibleCount] = useState(source.length);

  const applyFilterItems = useCallback((items: MultiFilterItem) => {
    const nextFilter = createOrderExplorerFilter(items);
    setFilter(nextFilter);
    if (gridRef.current) gridRef.current.filter = nextFilter;
  }, []);

  const applyPreset = (preset: OrderExplorerPreset) => {
    applyFilterItems(createOrderExplorerPreset(preset));
  };

  useEffect(() => {
    const grid = gridRef.current;
    const badgesRoot = badgesRef.current;
    if (!grid || !badgesRoot) return;
    let destroyed = false;
    let badges: Awaited<ReturnType<typeof mountOrderExplorerFilterBadges>> | undefined;
    const syncFilterState = async () => {
      setVisibleCount(await getOrderExplorerVisibleCount(grid, source.length));
    };
    grid.addEventListener('afterfilterapply', syncFilterState);
    void mountOrderExplorerFilterBadges(grid, badgesRoot).then(controller => {
      if (destroyed) controller.destroy();
      else badges = controller;
    });
    void getOrderExplorerVisibleCount(grid, source.length).then(setVisibleCount);
    return () => {
      destroyed = true;
      badges?.destroy();
      grid.removeEventListener('afterfilterapply', syncFilterState);
    };
  }, [source.length]);

  return (
    <section className="order-explorer" aria-label="Advanced Filtering: Order Explorer">
      <div className="order-explorer__toolbar">
        <div className="order-explorer__presets" aria-label="Filter presets">
          <p className="order-explorer__eyebrow">Presets</p>
          <button className="rv-btn" type="button" onClick={() => applyPreset('high-value-europe')}>High-value Europe</button>
          <button className="rv-btn" type="button" onClick={() => applyPreset('recent-expedited')}>Recent expedited</button>
          <button className="rv-btn" type="button" onClick={() => applyPreset('review-queue')}>Review queue</button>
        </div>
        <div className="order-explorer__summary">
          <span className="order-explorer__count" aria-live="polite">
            {visibleCount.toLocaleString()} of {source.length.toLocaleString()} orders
          </span>
          <button className="rv-btn-secondary" type="button" onClick={() => applyFilterItems({})}>Clear All</button>
        </div>
      </div>
      <div ref={badgesRef}></div>
      <div className="order-explorer__grid">
        <RevoGrid
          ref={gridRef}
          className="h-full w-full"
          theme={isDark() ? 'darkMaterial' : 'material'}
          columns={columns}
          source={source}
          plugins={plugins}
          columnTypes={columnTypes}
          filter={filter}
          stretch="all"
          hideAttribution={true}
          readonly={true}
          resize={true}
        />
      </div>
    </section>
  );
}
