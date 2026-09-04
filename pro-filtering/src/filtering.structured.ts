import {
  BUILT_IN_STRUCTURED_FILTER_TYPES,
  FILTER_ARRAY_TAGS,
  FILTER_CALENDAR_RANGE,
  FILTER_CHIP_BADGE_TOGGLES,
  FILTER_FACETED_LIST,
  FILTER_FUZZY,
  FILTER_HISTOGRAM_BRUSH,
  FILTER_RATING_PROGRESS_THRESHOLD,
  FILTER_REGEX,
  FILTER_RELATIVE_WINDOW,
  FILTER_STATISTICAL_PRESETS,
  FILTER_TIME_MATRIX,
  FILTER_TIMELINE_BRUSH,
  FILTER_TOKEN_LIST,
  FILTER_TRI_STATE_BOOLEAN,
  createCalendarRangeStructuredFilterType,
  createChipBadgeStructuredFilterType,
  createHistogramBrushStructuredFilterType,
  createRatingProgressThresholdStructuredFilterType,
  createRelativeWindowStructuredFilterType,
  createStatisticalPresetsStructuredFilterType,
  createTimeMatrixStructuredFilterType,
  createTimelineBrushStructuredFilterType,
} from '@revolist/revogrid-pro';

export {
  FILTER_ARRAY_TAGS,
  FILTER_CALENDAR_RANGE,
  FILTER_CHIP_BADGE_TOGGLES,
  FILTER_FACETED_LIST,
  FILTER_FUZZY,
  FILTER_HISTOGRAM_BRUSH,
  FILTER_RATING_PROGRESS_THRESHOLD,
  FILTER_REGEX,
  FILTER_RELATIVE_WINDOW,
  FILTER_STATISTICAL_PRESETS,
  FILTER_TIME_MATRIX,
  FILTER_TIMELINE_BRUSH,
  FILTER_TOKEN_LIST,
  FILTER_TRI_STATE_BOOLEAN,
};

const priorityColors: Readonly<Record<string, string>> = {
  Critical: '#dc2626',
  High: '#d97706',
  Normal: '#64748b',
  Low: '#94a3b8',
  Backlog: '#64748b',
};

const configuredTypes = new Map([
  [FILTER_CHIP_BADGE_TOGGLES, createChipBadgeStructuredFilterType({
    order: ['Critical', 'High', 'Normal', 'Low', 'Backlog'],
    badge: ({ value }) => ({
      label: String(value),
      color: priorityColors[String(value)],
    }),
  })],
  [FILTER_HISTOGRAM_BRUSH, createHistogramBrushStructuredFilterType({
    bins: 10,
    formatValue: value => `$${Math.round(value).toLocaleString('en-US')}`,
    formatMatchCount: count => `${count.toLocaleString('en-US')} orders`,
    chart: {
      type: 'line',
      showPoints: true,
      formatTooltip: (bin, { minLabel, maxLabel, selected }) => ({
        title: `${minLabel} – ${maxLabel}`,
        details: [
          `${bin.count.toLocaleString('en-US')} ${bin.count === 1 ? 'order' : 'orders'}`,
          selected ? 'Inside selected range' : 'Outside selected range',
        ],
      }),
    },
  })],
  [FILTER_RATING_PROGRESS_THRESHOLD, createRatingProgressThresholdStructuredFilterType({
    unit: 'stars',
    max: 5,
    step: 1,
  })],
  [FILTER_STATISTICAL_PRESETS, createStatisticalPresetsStructuredFilterType({
    formatValue: value => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`,
  })],
  [FILTER_CALENDAR_RANGE, createCalendarRangeStructuredFilterType({
    locale: 'en-US',
    weekStartsOn: 1,
  })],
  [FILTER_RELATIVE_WINDOW, createRelativeWindowStructuredFilterType({ locale: 'en-US' })],
  [FILTER_TIMELINE_BRUSH, createTimelineBrushStructuredFilterType({
    granularity: 'day',
    binCap: 32,
    locale: 'en-US',
    format: { month: 'short', day: 'numeric' },
    chart: {
      type: 'area',
      showPoints: true,
      formatTooltip: (bin, { fromLabel, toLabel, selected }) => ({
        title: fromLabel === toLabel ? fromLabel : `${fromLabel} – ${toLabel}`,
        details: [
          `${bin.count.toLocaleString('en-US')} ${bin.count === 1 ? 'record' : 'records'}`,
          selected ? 'Inside selected range' : 'Outside selected range',
        ],
      }),
    },
  })],
  [FILTER_TIME_MATRIX, createTimeMatrixStructuredFilterType({
    locale: 'en-US',
    weekStartsOn: 1,
    useAmPm: true,
  })],
]);

export const orderExplorerStructuredFilterTypes = Object.freeze(
  BUILT_IN_STRUCTURED_FILTER_TYPES.map(type => configuredTypes.get(type.id) ?? type),
);
