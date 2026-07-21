import { describe, expect, it, vi } from 'vitest';

vi.mock('@revolist/revogrid-enterprise', () => ({
  createDefaultTaskTableColumn: (prop: string) => ({ prop }),
}));

async function loadShowcaseData() {
  return import('./gantt-project-data');
}

function getParentTaskIds(tasks: readonly { parentId?: string | null }[]) {
  return new Set(tasks
    .map((task) => task.parentId)
    .filter((parentId): parentId is string => typeof parentId === 'string' && parentId.length > 0));
}

describe('shared Gantt showcase data', () => {
  it('omits authored task types from parent rows so Gantt can infer default summaries', async () => {
    const { SHOWCASE_TASKS } = await loadShowcaseData();
    const parentTaskIds = getParentTaskIds(SHOWCASE_TASKS);
    const parentRows = SHOWCASE_TASKS.filter((task) => parentTaskIds.has(task.id));

    expect(parentRows.map((task) => task.id)).toEqual(['launch', 'devops', 'qa', 'security']);
    expect(parentRows.every((task) => task.type === undefined)).toBe(true);
  });

  it('derives row completion from the authored workflow status', async () => {
    const { SHOWCASE_TASKS } = await loadShowcaseData();

    expect(SHOWCASE_TASKS.filter((task) => task.done).map((task) => task.id)).toEqual([
      'iac',
      'ci-cd',
      'test-plan',
    ]);
    expect(SHOWCASE_TASKS.every((task) => task.done === (task.workflowStatus === 'done'))).toBe(true);
  });

  it('places the single completion checkbox directly after WBS', async () => {
    const { SHOWCASE_COLUMNS_WITH_COMPLETION, SHOWCASE_DEFAULT_HIDDEN } = await loadShowcaseData();

    expect(SHOWCASE_COLUMNS_WITH_COMPLETION.slice(0, 3).map((column) => column.prop)).toEqual([
      'wbs',
      'done',
      'name',
    ]);
    expect(SHOWCASE_COLUMNS_WITH_COMPLETION[0]).toMatchObject({ filter: false });
    expect(SHOWCASE_COLUMNS_WITH_COMPLETION[1]).toMatchObject({ name: '', size: 58 });
    expect(SHOWCASE_DEFAULT_HIDDEN).toContain('wbs');
  });

  it('adds the finished task-bar class only for completed rows', async () => {
    const { renderShowcaseTaskBarColor } = await loadShowcaseData();

    expect(renderShowcaseTaskBarColor({ row: { done: false } })).toBeUndefined();
    expect(renderShowcaseTaskBarColor({ row: { done: true } })).toEqual({
      className: 'gantt-showcase-bar--finished',
    });
  });

  it('keeps default summary bar structure while hiding summary labels', async () => {
    const { renderShowcaseTaskBarContent } = await loadShowcaseData();
    const defaultContent = [
      { props: { class: { 'gantt-bar__line': true } } },
      { props: { class: { 'gantt-bar__cap': true, 'gantt-bar__cap--start': true } } },
      { props: { class: { 'gantt-bar__cap': true, 'gantt-bar__cap--end': true } } },
      { props: { class: { 'gantt-bar__label': true } } },
    ];

    expect(renderShowcaseTaskBarContent({
      h: () => null,
      row: { taskKind: 'summary' },
      defaultContent,
    })).toEqual(defaultContent.slice(0, 3));
  });

  it('shows a secondary assignee edge behind the primary task-bar badge', async () => {
    const { renderShowcaseTaskBarContent } = await loadShowcaseData();
    const h = (tag: string, props: Record<string, unknown>, children?: unknown) => ({ tag, props, children });
    const defaultContent = [{ props: { class: { 'gantt-bar__label': true } } }];
    const rendered = renderShowcaseTaskBarContent({
      h,
      row: {
        taskKind: 'task',
        assigneeDetails: [
          { id: 'primary', name: 'Ravi Patel', initials: 'RP', color: '#facc15' },
          { id: 'secondary', name: 'Jordan Diaz', initials: 'JD', color: '#f97316' },
          { id: 'hidden', name: 'Nina Kim', initials: 'NK', color: '#22d3ee' },
        ],
      },
      defaultContent,
    });
    const stack = rendered.at(-1);

    expect(stack).toMatchObject({
      tag: 'span',
      props: {
        class: {
          'gantt-bar__assignee-stack': true,
          'gantt-bar__assignee-stack--multiple': true,
        },
        title: 'Ravi Patel, Jordan Diaz, Nina Kim',
      },
    });
    expect(stack.children).toHaveLength(2);
    expect(stack.children[0]).toMatchObject({
      props: {
        class: {
          'gantt-bar__assignee-badge': true,
          'gantt-bar__assignee-badge--secondary': true,
        },
        style: { background: '#f97316' },
      },
      children: 'JD',
    });
    expect(stack.children[1]).toMatchObject({
      props: {
        class: {
          'gantt-bar__assignee-badge': true,
          'gantt-bar__assignee-badge--primary': true,
        },
        style: { background: '#facc15' },
      },
      children: 'RP',
    });

    const singleRendered = renderShowcaseTaskBarContent({
      h,
      row: {
        taskKind: 'task',
        assigneeDetails: [
          { id: 'primary', name: 'Ravi Patel', initials: 'RP', color: '#facc15' },
        ],
      },
      defaultContent,
    });
    const singleStack = singleRendered.at(-1);

    expect(singleStack.props.class['gantt-bar__assignee-stack--multiple']).toBe(false);
    expect(singleStack.children).toHaveLength(1);
    expect(singleStack.children[0].children).toBe('RP');
  });
});
