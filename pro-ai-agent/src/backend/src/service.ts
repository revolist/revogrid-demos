import { filterCoreFunctionsIndexedByType } from '@revolist/revogrid';
import {
  compileFilterAst,
  validateAiViewResponse,
  cloneAiView,
  type AiViewSnapshot,
  type AiViewField,
} from '@revolist/revogrid-pro';
import {
  aiViewColumns,
  aiViewFields,
  createAiViewRows,
} from '../../AiAssistant.data';

const rows = createAiViewRows(5000);
export function validateView(
  value: unknown,
  fields: readonly AiViewField[] = aiViewFields,
): AiViewSnapshot {
  if (
    !value ||
    typeof value !== 'object' ||
    !Array.isArray((value as AiViewSnapshot).sort)
  )
    throw new Error('Invalid view.');
  const view = value as AiViewSnapshot;
  validateAiViewResponse(
    {
      kind: 'command',
      filter: view.filter
        ? { mode: 'replace', ast: view.filter }
        : { mode: 'clear' },
      sort: view.sort.length
        ? { mode: 'replace', items: view.sort }
        : { mode: 'clear' },
    },
    fields,
  );
  return cloneAiView({ filter: view.filter, sort: view.sort });
}
/** Reference HTTP query: evaluate over all 5,000 rows, then return one page. */
export function queryOrders(input: {
  view: unknown;
  offset?: number;
  limit?: number;
}) {
  const view = validateView(input.view);
  const offset = input.offset ?? 0,
    limit = input.limit ?? 20;
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new Error('Invalid page.');
  const filter = view.filter
    ? compileFilterAst(view.filter, {
        columns: aiViewColumns,
        operators: filterCoreFunctionsIndexedByType,
      })
    : undefined;
  const matching = rows.filter((row) => !filter || filter.matches(row));
  matching.sort((a, b) => {
    for (const item of view.sort) {
      const av = a[item.field as keyof typeof a],
        bv = b[item.field as keyof typeof b];
      const compared =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      if (compared) return item.direction === 'asc' ? compared : -compared;
    }
    return a.id.localeCompare(b.id);
  });
  return {
    rows: matching.slice(offset, offset + limit),
    total: matching.length,
    offset,
    limit,
  };
}
