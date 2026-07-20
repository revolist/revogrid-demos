import {
  type CollaborativePresenceConfig,
  type CollaborativePresenceUser,
} from '@revolist/revogrid-pro';
import {
  createSpreadsheetPinnedBottomSource,
  createSpreadsheetScenarioFormulaRow,
  type SpreadsheetFlashPlugin,
  type SpreadsheetRow,
  type SpreadsheetWorkbook,
} from './spreadsheet.shared';

export type SpreadsheetPresenceSimulationResult = {
  users: CollaborativePresenceUser[];
  workbook: SpreadsheetWorkbook;
  message: string;
  flash?: {
    rowIndex: number;
    data: Record<string, unknown>;
    previousData: Record<string, unknown>;
  };
};

type PresencePatch = Pick<CollaborativePresenceUser, 'id'> &
  Partial<Pick<CollaborativePresenceUser, 'activity' | 'focus' | 'range'>>;

type PresenceStep = {
  users: PresencePatch[];
  edit?: { rowIndex: number; prop: 'jan' | 'feb' | 'mar' | 'status'; value: number | string };
  message?: string;
};

export const SPREADSHEET_COLLABORATORS: CollaborativePresenceUser[] = [
  {
    id: 'anna',
    name: 'Anna M.',
    initials: 'AM',
    color: '#2563eb',
    activity: 'editing',
    focus: { x: 4, y: 6 },
    range: { x: 4, y: 6, x1: 5, y1: 8 },
  },
  {
    id: 'sarah',
    name: 'Sarah K.',
    initials: 'SK',
    color: '#7c3aed',
    activity: 'viewing',
    focus: { x: 7, y: 2 },
    range: { x: 7, y: 2, x1: 8, y1: 3 },
  },
  {
    id: 'leo',
    name: 'Leo P.',
    initials: 'LP',
    color: '#0f8b4c',
    activity: 'idle',
    focus: { x: 10, y: 9 },
    range: { x: 10, y: 9, x1: 10, y1: 9 },
  },
];

const PRESENCE_STEPS: PresenceStep[] = [
  {
    users: [],
    message: 'Collaborators are reviewing the plan.',
  },
  {
    users: [
      { id: 'anna', activity: 'editing', focus: { x: 3, y: 7 }, range: { x: 2, y: 7, x1: 4, y1: 7 } },
    ],
    edit: { rowIndex: 7, prop: 'jan', value: 71000 },
  },
  {
    users: [
      { id: 'sarah', activity: 'editing', focus: { x: 10, y: 3 }, range: { x: 10, y: 3, x1: 10, y1: 3 } },
      { id: 'anna', activity: 'viewing' },
    ],
    edit: { rowIndex: 3, prop: 'status', value: 'Forecast' },
  },
  {
    users: [
      { id: 'leo', activity: 'viewing', focus: { x: 2, y: 5 }, range: { x: 2, y: 5, x1: 4, y1: 5 } },
    ],
    message: 'Leo P. is checking historical actuals.',
  },
  {
    users: [
      { id: 'sarah', activity: 'editing', focus: { x: 4, y: 8 }, range: { x: 2, y: 8, x1: 4, y1: 8 } },
    ],
    edit: { rowIndex: 8, prop: 'mar', value: 116000 },
  },
  {
    users: [
      { id: 'anna', activity: 'idle', focus: { x: 6, y: 11 }, range: { x: 5, y: 11, x1: 6, y1: 11 } },
      { id: 'leo', activity: 'viewing', focus: { x: 9, y: 0 }, range: { x: 8, y: 0, x1: 9, y1: 1 } },
    ],
    message: 'Anna M. paused while Leo P. reviews trend cells.',
  },
];

const IMPORTED_PRESENCE_STEPS: Array<PresencePatch[]> = [
  [],
  [
    { id: 'anna', activity: 'viewing', focus: { x: 1, y: 0 }, range: { x: 1, y: 0, x1: 2, y1: 0 } },
  ],
  [
    { id: 'sarah', activity: 'viewing', focus: { x: 0, y: 1 }, range: { x: 0, y: 1, x1: 1, y1: 1 } },
  ],
  [
    { id: 'leo', activity: 'idle', focus: { x: 2, y: 0 }, range: { x: 2, y: 0, x1: 2, y1: 0 } },
  ],
];

export function createSpreadsheetCollaborativePresence(users: CollaborativePresenceUser[]): CollaborativePresenceConfig {
  return {
    enabled: true,
    showLabels: true,
    staleAfterMs: 12_000,
    users,
  };
}

export function createSpreadsheetPresenceUsers(
  stepIndex = 0,
  imported = false,
  now = Date.now(),
): CollaborativePresenceUser[] {
  const steps = imported
    ? IMPORTED_PRESENCE_STEPS
    : PRESENCE_STEPS.map(step => step.users);
  const cycleIndex = stepIndex % steps.length;
  const userById = new Map(SPREADSHEET_COLLABORATORS.map(user => [user.id, { ...user }]));

  for (let index = 0; index <= cycleIndex; index += 1) {
    steps[index]?.forEach((patch) => {
      const user = userById.get(patch.id);
      if (user) {
        userById.set(patch.id, { ...user, ...patch });
      }
    });
  }

  return SPREADSHEET_COLLABORATORS.map((user, index) => ({
    ...userById.get(user.id)!,
    lastActiveAt: now - index * 850,
  }));
}

export function applySpreadsheetPresenceSimulationStep(
  workbook: SpreadsheetWorkbook,
  stepIndex: number,
): SpreadsheetPresenceSimulationResult {
  const users = createSpreadsheetPresenceUsers(stepIndex, workbook.imported);
  const step = PRESENCE_STEPS[stepIndex % PRESENCE_STEPS.length];
  if (workbook.imported || workbook.sheetKey === 'empty' || !step?.edit) {
    return {
      users,
      workbook,
      message: workbook.imported
        ? 'Collaborators are viewing the imported sheet.'
        : workbook.sheetKey === 'empty'
          ? 'Collaborators are setting up the blank workbook.'
        : step?.message ?? 'Collaborators moved through the plan.',
    };
  }

  const row = workbook.rows[step.edit.rowIndex] as SpreadsheetRow | undefined;
  if (!row) {
    return { users, workbook, message: 'Collaborators moved through the plan.' };
  }

  const previousValue = row[step.edit.prop];
  if (previousValue === step.edit.value) {
    return { users, workbook, message: `${users[0]?.name ?? 'A collaborator'} is reviewing live cells.` };
  }

  const nextRows = workbook.rows.map((candidate, index) => {
    if (index !== step.edit!.rowIndex) {
      return candidate;
    }
    return createSpreadsheetScenarioFormulaRow({
      ...(candidate as SpreadsheetRow),
      [step.edit!.prop]: step.edit!.value,
    }, index);
  });
  const nextWorkbook: SpreadsheetWorkbook = {
    ...workbook,
    rows: nextRows,
    // Keep column schema stable for realtime simulation updates so view-level
    // features (like column collapse) are not reset by unrelated refreshes.
    formulaNames: workbook.formulaNames,
    columns: workbook.columns,
    pinnedBottomSource: createSpreadsheetPinnedBottomSource(nextRows),
    cellMerge: workbook.cellMerge,
  };

  return {
    users,
    workbook: nextWorkbook,
    message: `${users.find(user => user.activity === 'editing')?.name ?? 'A collaborator'} updated ${String(step.edit.prop)}.`,
    flash: {
      rowIndex: step.edit.rowIndex,
      data: { [step.edit.prop]: step.edit.value },
      previousData: { [step.edit.prop]: previousValue },
    },
  };
}

export function flashSpreadsheetPresenceEdit(
  plugin: SpreadsheetFlashPlugin | undefined,
  result: SpreadsheetPresenceSimulationResult,
) {
  if (!plugin?.flashCells || !result.flash) {
    return;
  }
  plugin.flashCells({
    type: 'rgRow',
    data: { [result.flash.rowIndex]: result.flash.data },
    previousData: { [result.flash.rowIndex]: result.flash.previousData },
    eventTypes: ['spreadsheet-presence-edit'],
  }, {
    mode: 'cell-and-row',
    duration: 1300,
    rowDuration: 1500,
  });
}
