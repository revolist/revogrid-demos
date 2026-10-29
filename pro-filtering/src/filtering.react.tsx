import '@revolist/ui/styles.css';
import { ButtonControl as UiButton, Input as UiInput } from '@revolist/ui/react-control';
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
  orderExplorerFilterBadgeOptions,
  orderExplorerPlugins,
  type OrderExplorerPreset,
  type OrderExplorerRow,
} from './filtering.shared';
import './filtering.scss';

export default function Filtering({ rows }: { rows?: OrderExplorerRow[] }) {
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const source = useMemo(() => rows?.length ? rows : createOrderExplorerRows(), [rows]);
  const [columns, setColumns] = useState(() => createOrderExplorerColumns());
  const plugins = useMemo(() => [...orderExplorerPlugins], []);
  const columnTypes = useMemo(() => createOrderExplorerColumnTypes(), []);
  const [filter, setFilter] = useState<ColumnFilterConfig>(() =>
    createOrderExplorerFilter(createOrderExplorerInitialFilters()),
  );
  const [visibleCount, setVisibleCount] = useState(source.length);
  const [quickText, setQuickText] = useState('');
  const [darkTheme, setDarkTheme] = useState(() => currentTheme().isDark());

  useEffect(() => observeCurrentTheme(setDarkTheme), []);

  // Presets and header filters use the same public `filter` property.
  const applyFilterItems = useCallback((items: MultiFilterItem) => {
    const nextFilter = createOrderExplorerFilter(items);
    setFilter(nextFilter);
    setColumns(createOrderExplorerColumns());
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
          <UiButton className="rv-btn" type="button" onClick={() => applyPreset('high-value-europe')}>High-value Europe</UiButton>
          <UiButton className="rv-btn" type="button" onClick={() => applyPreset('recent-expedited')}>Recent expedited</UiButton>
          <UiButton className="rv-btn" type="button" onClick={() => applyPreset('review-queue')}>Review queue</UiButton>
        </div>
        <div className="order-explorer__search">
          <UiInput
            className="order-explorer__search-input"
            type="search"
            value={quickText}
            placeholder="Global search — try “Lisbon pending”"
            aria-label="Search all visible columns"
            onChange={event => applyQuickFilter(event.target.value)}
          />
          <UiButton className="rv-btn" type="button" onClick={() => applyQuickFilter(ORDER_EXPLORER_QUICK_FILTER_EXAMPLE)}>Try example</UiButton>
        </div>
        <div className="order-explorer__summary">
          <span className="order-explorer__count" aria-live="polite">
            {visibleCount.toLocaleString()} of {source.length.toLocaleString()} orders
          </span>
          <UiButton className="rv-btn-secondary" type="button" onClick={() => {
            applyFilterItems({});
            applyQuickFilter('');
          }}>Clear All</UiButton>
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
          filterBadges={orderExplorerFilterBadgeOptions}
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
