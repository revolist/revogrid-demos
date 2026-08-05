import type { ColumnData, DataType } from '@revolist/revogrid';
import { ExportExcelPlugin, type ExportExcelEvent } from '@revolist/revogrid-pro';

type ExportResult<T extends DataType> = T[] | { data?: T[] };

export async function exportInfinityScrollRows<T extends DataType>({
  columns,
  total,
  loadData,
  theme = 'material',
  setStatus,
}: {
  columns: ColumnData;
  total: number;
  loadData: (skip: number, limit: number) => Promise<ExportResult<T>>;
  theme?: HTMLRevoGridElement['theme'];
  setStatus?: (message: string) => void;
}) {
  const rows: T[] = [];
  const chunkSize = 250;
  for (let skip = 0; skip < total; skip += chunkSize) {
    const limit = Math.min(chunkSize, total - skip);
    setStatus?.(`Preparing export: ${skip + 1}–${skip + limit} of ${total}`);
    const result = await loadData(skip, limit);
    rows.push(...(Array.isArray(result) ? result : result.data ?? []));
  }

  const exportGrid = document.createElement('revo-grid');
  exportGrid.columns = columns;
  exportGrid.plugins = [ExportExcelPlugin];
  exportGrid.theme = theme;
  exportGrid.hideAttribution = true;
  Object.assign(exportGrid.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
  });
  document.body.appendChild(exportGrid);
  exportGrid.source = rows;

  try {
    const plugins = await exportGrid.getPlugins();
    const exportPlugin = plugins.find((plugin) => plugin instanceof ExportExcelPlugin) as ExportExcelPlugin | undefined;
    const config: ExportExcelEvent = {
      workbookName: 'infinity-scroll.xlsx',
      sheetName: 'Infinity Scroll',
      providerOptions: { showGridLines: true },
    };
    setStatus?.(`Exporting ${rows.length} rows to Excel…`);
    await exportPlugin?.export(config);
    setStatus?.(`Exported ${rows.length} rows.`);
  } finally {
    exportGrid.remove();
  }
}
