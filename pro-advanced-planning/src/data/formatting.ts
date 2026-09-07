import type {
  DataGridCellFormat,
  DataGridFormattingPresetState,
} from '@revolist/revogrid-pro';

const text = {
  value: {
    kind: 'preset',
    preset: 'text',
  },
  appearance: {
    horizontal: 'left',
  },
} as const satisfies DataGridCellFormat;

const visual = {
  appearance: {
    horizontal: 'left',
  },
} as const satisfies DataGridCellFormat;

export const planningGridFormats = {
  name: text,
  owner: visual,
  workflowStatus: visual,
  priority: visual,
  endDate: {
    value: {
      kind: 'preset',
      preset: 'date',
      locale: 'en-US',
      dateStyle: 'medium',
      timeZone: 'UTC',
    },
  },
  percentDone: {
    presentation: {
      id: 'progress-line',
      options: { minValue: 0, maxValue: 100 },
    },
  },
  budget: {
    value: {
      kind: 'preset',
      preset: 'currency',
      locale: 'en-US',
      currency: 'USD',
      decimalPlaces: 0,
    },
  },
  activityAt: {
    value: {
      kind: 'preset',
      preset: 'datetime',
      locale: 'en-US',
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    },
  },
} as const satisfies Record<string, DataGridCellFormat>;

/** Application-owned formatting state; column formats remain the stable defaults. */
export const planningDataGridFormatting = {} as const satisfies DataGridFormattingPresetState;
