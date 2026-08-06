import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnFilterConfig, MultiFilterItem } from '@revolist/revogrid';
import { RevoGrid } from '@revolist/react-datagrid';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createOrderExplorerColumns,
  createOrderExplorerColumnTypes,
  createOrderExplorerFilter,
  createOrderExplorerInitialFilters,
  createOrderExplorerPreset,
  createOrderExplorerRows,
  getOrderExplorerVisibleCount,
  setOrderExplorerQuickFilter,
  ORDER_EXPLORER_QUICK_FILTER_EXAMPLE,
  orderExplorerPlugins,
  type OrderExplorerPreset,
  type OrderExplorerRow,
} from './filtering.shared';
import './filtering.scss';

export default function Filtering({ rows }: { rows?: OrderExplorerRow[] }) {
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const source = useMemo(() => rows?.length ? rows : createOrderExplorerRows(), [rows]);
  const columns = useMemo(() => createOrderExplorerColumns(), []);
  const plugins = useMemo(() => [...orderExplorerPlugins], []);
  const columnTypes = useMemo(() => createOrderExplorerColumnTypes(), []);
  const [filter, setFilter] = useState<ColumnFilterConfig | undefined>(undefined);
  const [visibleCount, setVisibleCount] = useState(source.length);
  const [quickText, setQuickText] = useState('');
  const [darkTheme, setDarkTheme] = useState(() => currentTheme().isDark());

  useEffect(() => observeCurrentTheme(setDarkTheme), []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let cancelled = false;
    void grid.componentOnReady().then(() => {
      if (cancelled) return;
      const initialFilter = createOrderExplorerFilter(createOrderExplorerInitialFilters());
      setFilter(initialFilter);
      grid.filter = initialFilter;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Presets and header filters use the same public `filter` property.
  const applyFilterItems = useCallback((items: MultiFilterItem) => {
    const nextFilter = createOrderExplorerFilter(items);
    setFilter(nextFilter);
    if (gridRef.current) gridRef.current.filter = nextFilter;
  }, []);

  const applyPreset = (preset: OrderExplorerPreset) => {
    applyFilterItems(createOrderExplorerPreset(preset));
  };

  const applyQuickFilter = useCallback((text: string) => {
    setQuickText(text);
    if (gridRef.current) setOrderExplorerQuickFilter(gridRef.current, text);
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const syncFilterState = async () => {
      setVisibleCount(await getOrderExplorerVisibleCount(grid, source.length));
    };
    grid.addEventListener('afterfilterapply', syncFilterState);
    void getOrderExplorerVisibleCount(grid, source.length).then(setVisibleCount);
    return () => {
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
        <div className="order-explorer__search">
          <input
            className="order-explorer__search-input"
            type="search"
            value={quickText}
            placeholder="Global search — try “Lisbon pending”"
            aria-label="Search all visible columns"
            onChange={event => applyQuickFilter(event.target.value)}
          />
          <button className="rv-btn" type="button" onClick={() => applyQuickFilter(ORDER_EXPLORER_QUICK_FILTER_EXAMPLE)}>Try example</button>
        </div>
        <div className="order-explorer__summary">
          <span className="order-explorer__count" aria-live="polite">
            {visibleCount.toLocaleString()} of {source.length.toLocaleString()} orders
          </span>
          <button className="rv-btn-secondary" type="button" onClick={() => {
            applyFilterItems({});
            applyQuickFilter('');
          }}>Clear All</button>
        </div>
      </div>
      <div className="order-explorer__grid">
        <RevoGrid
          ref={gridRef}
          className="h-full w-full"
          theme={darkTheme ? 'darkMaterial' : 'material'}
          columns={columns}
          plugins={plugins}
          columnTypes={columnTypes}
          filter={filter}
          stretch="all"
          hideAttribution={true}
          readonly={true}
          resize={true}
          source={source}
        />
      </div>
    </section>
  );
}
