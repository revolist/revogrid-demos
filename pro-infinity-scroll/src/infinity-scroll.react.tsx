import { useCallback, useMemo, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import type { ColumnProp, FilterCollectionItem, MultiFilterItem } from '@revolist/revogrid';
import {
  AdvanceFilterPlugin,
  ColumnStretchPlugin,
  FIlTER_SELECTION,
  InfinityScrollPlugin,
  RowOddPlugin,
  RowSelectPlugin,
  type InfinityScrollConfig,
} from '@revolist/revogrid-pro';
import { exportInfinityScrollRows } from './infinity-scroll.export';
import {
  createInfinityScrollColumns,
  createInfinityScrollDataLoader,
  createInfinityScrollPinnedBottomRows,
  createInfinityScrollPinnedTopRows,
  createInfinityScrollRows,
  prefersDarkTheme,
  type InfinityScrollQuickFilter,
  type InfinityScrollUser,
} from './infinity-scroll.shared';
import './infinity-scroll.scss';

export default function InfinityScroll({ rows }: { rows?: InfinityScrollUser[] }) {
  const [status, setStatus] = useState('Initializing remote source…');
  const [exporting, setExporting] = useState(false);
  const dataset = useMemo(() => rows?.length ? rows : createInfinityScrollRows(), [rows]);
  const source = useMemo<InfinityScrollUser[]>(() => [], []);
  const columns = useMemo(() => createInfinityScrollColumns(), []);
  const plugins = useMemo(() => [
    InfinityScrollPlugin,
    AdvanceFilterPlugin,
    RowOddPlugin,
    RowSelectPlugin,
    ColumnStretchPlugin,
  ], []);
  const pinnedTopSource = useMemo(() => createInfinityScrollPinnedTopRows(), []);
  const pinnedBottomSource = useMemo(() => createInfinityScrollPinnedBottomRows(), []);
  const serverLoader = useMemo(() => createInfinityScrollDataLoader({
    rows: dataset,
    selectionFilterType: FIlTER_SELECTION,
  }), [dataset]);

  const loadData = useCallback(async (
    skip: number,
    limit: number,
    order?: Partial<Record<ColumnProp, 'asc' | 'desc'>>,
    singleFilters?: Record<ColumnProp, FilterCollectionItem>,
    multiFilters?: MultiFilterItem,
    quickFilter?: InfinityScrollQuickFilter,
  ) => {
    setStatus(`Fetching rows ${skip + 1}–${Math.min(skip + limit, dataset.length)}…`);
    const result = await serverLoader(skip, limit, order, singleFilters, multiFilters, quickFilter);
    setStatus(`Loaded ${result.total.toLocaleString()} matching records`);
    return result;
  }, [dataset.length, serverLoader]);
  const infinityScroll = useMemo<Partial<InfinityScrollConfig>>(() => ({
    chunkSize: 50,
    bufferSize: 150,
    preloadThreshold: 0.75,
    total: dataset.length,
    loadData,
  }), [dataset.length, loadData]);

  const exportAll = async () => {
    setExporting(true);
    try {
      await exportInfinityScrollRows({
        columns,
        total: dataset.length,
        loadData: serverLoader,
        theme: prefersDarkTheme() ? 'darkMaterial' : 'material',
        setStatus,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="infinity-showcase" aria-label="Infinity Scroll remote directory">
      <div className="infinity-toolbar">
        <div className="infinity-toolbar__copy">
          <strong>Remote user directory</strong>
          <span className="infinity-status">{status}</span>
        </div>
        <button className="infinity-button" type="button" disabled={exporting} onClick={exportAll}>
          {exporting ? 'Preparing export…' : 'Export all to Excel'}
        </button>
      </div>
      <RevoGrid
        className="infinity-grid"
        theme={prefersDarkTheme() ? 'darkMaterial' : 'material'}
        columns={columns}
        source={source}
        pinnedTopSource={pinnedTopSource}
        pinnedBottomSource={pinnedBottomSource}
        plugins={plugins}
        infinityScroll={infinityScroll}
        stretch="last"
        rowHeaders={true}
        hideAttribution={true}
      />
    </section>
  );
}
