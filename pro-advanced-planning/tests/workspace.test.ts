import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
    createTasks,
    getOwnerAvatar,
    planningPeople,
} from '../src/data/fixtures'
import {
    activePlanningFilters,
    defaultPlanningFilters,
    deletePlanningTasks,
    filterPlanningTasks,
    mergeVisibleTasks,
    reorderVisibleTasks,
} from '../src/data/workspace'
import { updateFromPlanningEdit } from '../src/data/sync'
import { PlanningWorkspaceStore } from '../src/data/store'
import {
    getPlanningVisibleSource,
    PlanningWorkspacePlugin,
} from '../src/data/workspace.plugin'
import { planningFields } from '../src/data/fields'
import { createKanbanConfig } from '../src/data/kanban.config'
import {
    filterGanttDependencies,
    schedulerResources,
    toGanttAssignments,
} from '../src/data/source'
const planningFieldsSource = readFileSync(
    new URL('../src/data/fields.ts', import.meta.url),
    'utf8'
)
const ganttConfigSource = readFileSync(
    new URL('../src/data/gantt.config.ts', import.meta.url),
    'utf8'
)
const kanbanConfigSource = readFileSync(
    new URL('../src/data/kanban.config.ts', import.meta.url),
    'utf8'
)
const planningSource = readFileSync(
    new URL('../src/data/source.ts', import.meta.url),
    'utf8'
)
const schedulerConfigSource = readFileSync(
    new URL('../src/data/scheduler.config.ts', import.meta.url),
    'utf8'
)
const columnsSource = readFileSync(
    new URL('../src/data/columns.ts', import.meta.url),
    'utf8'
)
const formattingSource = readFileSync(
    new URL('../src/data/formatting.ts', import.meta.url),
    'utf8'
)
const structuredSource = readFileSync(
    new URL('../src/data/planning.structured.ts', import.meta.url),
    'utf8'
)
const stylesSource = readFileSync(
    new URL('../src/planning.scss', import.meta.url),
    'utf8'
)
const vueSource = readFileSync(
    new URL('../src/planning.vue', import.meta.url),
    'utf8'
)
const vueWorkspaceSource = readFileSync(
    new URL('../src/composables/usePlanningWorkspace.ts', import.meta.url),
    'utf8'
)
const vanillaSource = readFileSync(
    new URL('../src/planning.ts', import.meta.url),
    'utf8'
)
const reactSource = readFileSync(
    new URL('../src/planning.react.tsx', import.meta.url),
    'utf8'
)
const angularSource = readFileSync(
    new URL('../src/planning.angular.ts', import.meta.url),
    'utf8'
)
const demoNavigationSource = readFileSync(
    new URL('../../../.vitepress/theme/DemoNavigation.vue', import.meta.url),
    'utf8'
)
const siteStylesSource = readFileSync(
    new URL('../../../.vitepress/theme/style.scss', import.meta.url),
    'utf8'
)

test('keeps all Planning framework variants free of guided tips', () => {
    for (const source of [
        `${vueSource}\n${vueWorkspaceSource}`,
        vanillaSource,
        reactSource,
        angularSource,
    ]) {
        assert.doesNotMatch(source, /planningTip|Show tips|Dismiss tips/)
        assert.match(source, /createKanbanConfig/)
        assert.doesNotMatch(source, /beforeedit/)
    }
    assert.doesNotMatch(stylesSource, /planning-demo__(tip|completion)|planning-card--updated/)
})

test('keeps task counts out of every Planning framework variant', () => {
    for (const source of [
        `${vueSource}\n${vueWorkspaceSource}`,
        vanillaSource,
        reactSource,
        angularSource,
    ]) {
        assert.doesNotMatch(source, /planning-demo__count|selectedCount/)
    }
})

test('marks the Active tasks preset while it is applied in every framework', () => {
    assert.match(vueWorkspaceSource, /const isActiveTasksPreset = ref\(false\)/)
    assert.match(vueSource, /:class="\{ on: isActiveTasksPreset \}"/)
    assert.match(vueSource, /:aria-pressed="isActiveTasksPreset"/)

    assert.match(vanillaSource, /let isActiveTasksPreset = false/)
    assert.match(vanillaSource, /activeTasks\.classList\.toggle\('on', isActiveTasksPreset\)/)
    assert.match(vanillaSource, /activeTasks\.ariaPressed = String\(isActiveTasksPreset\)/)

    assert.match(reactSource, /const \[isActiveTasksPreset, setIsActiveTasksPreset\] = useState\(false\)/)
    assert.match(reactSource, /className=\{isActiveTasksPreset \? 'on' : undefined\}/)
    assert.match(reactSource, /aria-pressed=\{isActiveTasksPreset\}/)

    assert.match(angularSource, /isActiveTasksPreset = false/)
    assert.match(angularSource, /\[class\.on\]="isActiveTasksPreset"/)
    assert.match(angularSource, /\[attr\.aria-pressed\]="isActiveTasksPreset"/)
    assert.match(
        stylesSource,
        /planning-demo__actions > button\.on,[\s\S]*?planning-demo__toolbar > button\.on\s*\{[\s\S]*?background: var\(--rv-ui-surface\)/
    )
})

test('uses the Pro dropdown editor with canonical owner and status values', () => {
    assert.match(
        columnsSource,
        /gridColumnTypes\s*=\s*\{\s*dropdown:\s*ColumnDropdown/
    )
    assert.match(
        columnsSource,
        /prop:\s*'workflowStatus'[\s\S]*?columnType:\s*'dropdown'[\s\S]*?source:\s*workflowEditorOptions[\s\S]*?syncCellTemplate:\s*true[\s\S]*?cellTemplate:\s*workflowStatusBadgeRenderer/
    )
    assert.match(columnsSource, /'not-started':\s*'Planned'/)
    assert.match(columnsSource, /'in-progress':\s*'In progress'/)
    assert.match(columnsSource, /blocked:\s*'Blocked'/)
    assert.match(columnsSource, /done:\s*'Done'/)
    assert.match(vueSource, /:column-types="gridColumnTypes"/)
})

test('shares one field map and one direct task source across planning views', () => {
    assert.deepEqual(planningFields, {
        id: 'id',
        title: 'name',
        status: 'workflowStatus',
        start: 'startDate',
        end: 'endDate',
        color: 'color',
        progress: 'percentDone',
        resourceId: 'owner',
    })
    assert.match(planningFieldsSource, /satisfies ViewFieldMap/)
    for (const source of [ganttConfigSource, kanbanConfigSource, schedulerConfigSource]) {
        assert.match(source, /fields:\s*planningFields/)
    }
    assert.doesNotMatch(kanbanConfigSource, /columnField|titleField|startField|endField|progressField|colorField|assigneeField/)
    for (const source of [vueSource, vanillaSource, reactSource, angularSource]) {
        assert.doesNotMatch(source, /toSchedulerEvents|schedulerEvents/)
    }
    assert.equal((vueSource.match(/:source="visibleTasks"/g) || []).length, 4)
    assert.equal((reactSource.match(/source=\{visibleTasks\}/g) || []).length, 4)
    assert.equal((vanillaSource.match(/grid\.source = visibleTasks/g) || []).length, 1)
    assert.equal((angularSource.match(/\[source\]="visibleTasks"/g) || []).length, 5)
})

test('pins selection and task identity with space for native checkboxes', () => {
    assert.match(
        columnsSource,
        /prop: '_selected',[\s\S]*?name: '',[\s\S]*?size: 48,[\s\S]*?pin: 'colPinStart',[\s\S]*?rowSelect: true/
    )
    assert.match(
        columnsSource,
        /prop: 'name',[\s\S]*?name: 'Task',[\s\S]*?size: 220,[\s\S]*?pin: 'colPinStart'/
    )
})

test('disables native row resizing in every planning framework', () => {
    for (const source of [
        columnsSource,
        vueSource,
        reactSource,
        vanillaSource,
        angularSource,
    ]) {
        assert.doesNotMatch(source, /planningRowResize|resizeRow|resize-row/)
    }
})

test('enables shared Pro row ordering for every planning Grid variant', () => {
    assert.match(columnsSource, /planningRowOrder[\s\S]*?prop:\s*'name'[\s\S]*?preview:\s*'compact'/)
    assert.match(columnsSource, /prop: 'name',[\s\S]*?rowDrag: true/)
    assert.match(vueSource, /:row-order\.prop="planningRowOrder"/)
    assert.match(vueSource, /:row-select\.prop="rowSelect"/)
    assert.match(reactSource, /RowOrderPlugin/)
    assert.match(reactSource, /rowOrder=\{planningRowOrder\}/)
    assert.match(vanillaSource, /RowOrderPlugin/)
    assert.match(vanillaSource, /grid\.rowOrder = planningRowOrder/)
    assert.match(angularSource, /RowOrderPlugin/)
    assert.match(angularSource, /\[rowOrder\]="planningRowOrder"/)
    for (const source of [vueWorkspaceSource, reactSource, vanillaSource, angularSource]) {
        assert.match(source, /rowOrder:\s*true/)
        assert.match(source, /commitVisibleOrder/)
    }
})

test('persists visible row order without moving filtered-out tasks', () => {
    const [first, hidden, third] = createTasks().slice(0, 3)
    const reordered = reorderVisibleTasks(
        [first, hidden, third],
        [third, first]
    )

    assert.deepEqual(reordered.map(({ id }) => id), [third.id, hidden.id, first.id])

    const store = new PlanningWorkspaceStore([first, hidden, third])
    store.commitVisibleOrder([third, first])
    assert.deepEqual(
        store.createSnapshot().map(({ id }) => id),
        [third.id, hidden.id, first.id]
    )
})

test('uses the grid header divider for the select-all checkbox column', () => {
    assert.doesNotMatch(columnsSource, /selectAllHeaderProperties/)
    assert.doesNotMatch(
        columnsSource,
        /prop: '_selected',[\s\S]*?columnProperties:/
    )
})

test('allocates enough width for formatted due dates', () => {
    assert.match(
        columnsSource,
        /prop: 'endDate',[\s\S]*?name: 'Due date',[\s\S]*?size: 130/
    )
})

test('allocates enough width for formatted activity times', () => {
    assert.match(
        columnsSource,
        /prop: 'activityAt',[\s\S]*?name: 'Activity time',[\s\S]*?size: 173/
    )
})

test('uses concise Project workspace filter-header labels', () => {
    assert.match(
        columnsSource,
        /prop: 'workflowStatus',[\s\S]*?size: 145,[\s\S]*?filterPlaceholder: 'All'/
    )
    assert.match(
        columnsSource,
        /prop: 'endDate',[\s\S]*?filterPlaceholder: 'Due date'/
    )
    assert.match(
        columnsSource,
        /prop: 'activityAt',[\s\S]*?filterPlaceholder: 'Time'/
    )
})

test('uses compact Activity time selection summaries', () => {
    assert.match(columnsSource, /timeMatrixBadgeSummaryOne: '1 hr'/)
    assert.match(
        columnsSource,
        /timeMatrixBadgeSummaryMany: '\{hours\} hrs'/
    )
})

test('removes the tab-to-content gap for timeline views only', () => {
    assert.match(
        stylesSource,
        /planning-demo__grid--timeline\s*\{[^}]*margin-top:\s*-8px/
    )
    assert.match(
        vueSource,
        /activeView === 'gantt'[\s\S]*?planning-demo__grid--timeline/
    )
    assert.match(
        vueSource,
        /:key="activeView"[\s\S]*?class="planning-demo__grid planning-demo__grid--timeline"/
    )
    assert.match(
        vanillaSource,
        /panel\.classList\.toggle\(\s*'planning-demo__grid--timeline',[\s\S]*?view === 'gantt' \|\| view === 'scheduler' \|\| view === 'calendar'\s*\)/
    )
    assert.match(
        reactSource,
        /key="gantt"[\s\S]*?planning-demo__grid--timeline/
    )
    assert.match(
        reactSource,
        /key=\{activeView\}[\s\S]*?planning-demo__grid--timeline/
    )
    assert.match(
        angularSource,
        /@case \('gantt'\)[\s\S]*?planning-demo__grid--timeline/
    )
    assert.match(
        angularSource,
        /@case \('scheduler'\)[\s\S]*?planning-demo__grid--timeline/
    )
    assert.match(
        angularSource,
        /@case \('calendar'\)[\s\S]*?planning-demo__grid--timeline/
    )
})

test('keeps scheduler and calendar events free of conflict validation outlines', () => {
    assert.match(schedulerConfigSource, /conflicts: \{ enabled: false \}/)
})

test('grows resource timeline rows for concurrent scheduler events by default', () => {
    assert.match(schedulerConfigSource, /resourceTimelineRowSizing:\s*true/)
})

test('keeps generated scheduler timeline columns in chronological order', () => {
    assert.match(vueSource, /:can-move-columns="false"/)
    assert.match(vanillaSource, /grid\.canMoveColumns = false/)
    assert.match(reactSource, /canMoveColumns=\{false\}/)
    assert.equal(
        (angularSource.match(/\[canMoveColumns\]="false"/g) ?? []).length,
        2
    )
    assert.match(vueSource, /can-move-columns/)
    assert.match(vanillaSource, /grid\.canMoveColumns = true/)
    assert.match(reactSource, /canMoveColumns/)
    assert.match(angularSource, /\[canMoveColumns\]="true"/)
})

test('aligns the Gantt timeline with the planning fixture window', () => {
    assert.match(ganttConfigSource, /weekStartsOn: 1/)
    assert.match(ganttConfigSource, /showTaskLabels:\s*false/)
    assert.match(ganttConfigSource, /taskModeDefault:\s*'auto'/)
    assert.match(
        ganttConfigSource,
        /timelineRange: \{ startDate: '2026-09-07', endDate: '2026-10-09' \}/
    )
})

test('drives Gantt and Scheduler from the same authored task fields', () => {
    const task = createTasks().find(({ type }) => type === 'task')!

    assert.equal(task.durationUnit, 'hour')
    assert.equal(task.durationIsElapsed, true)
    assert.doesNotMatch(planningSource, /toGanttTasks/)
    assert.doesNotMatch(planningSource, /toSchedulerEvents|getPlanningEndDate/)
    for (const source of [vueSource, vanillaSource, reactSource, angularSource]) {
        assert.match(source, /gridedit/i)
        assert.doesNotMatch(source, /gantt-before-task-change|event\.preventDefault\(\)/)
    }
})

test('builds Gantt assignments directly from the visible task source', () => {
    const visibleTasks = createTasks().slice(0, 2)

    assert.deepEqual(
        toGanttAssignments(visibleTasks).map(({ taskId }) => taskId),
        visibleTasks.map(({ id }) => id)
    )
    assert.match(vueWorkspaceSource, /toGanttAssignments\(visibleTasks\.value\)/)
    assert.match(reactSource, /toGanttAssignments\(visibleTasks\)/)
    assert.match(angularSource, /toGanttAssignments\(this\.visibleTasks\)/)
    assert.match(vanillaSource, /toGanttAssignments\(visibleTasks\)/)
    for (const source of [vueWorkspaceSource, reactSource, angularSource, vanillaSource]) {
        assert.doesNotMatch(source, /visibleIds/)
    }
    assert.equal('owners' in visibleTasks[0], false)
})

test('hides unsupported structural planning actions', () => {
    assert.match(ganttConfigSource, /contextMenu:\s*\{\s*row:\s*false\s*\}/)
    assert.match(
        columnsSource,
        /createDefaultTaskTableColumn\('assignees'\)[\s\S]*?readonly:\s*true/
    )
    assert.match(
        columnsSource,
        /createDefaultTaskTableColumn\('name'\)[\s\S]*?rowDrag:\s*false/
    )
    assert.match(
        kanbanConfigSource,
        /contextMenu:\s*\{\s*hidden:\s*\{\s*create:\s*true,\s*delete:\s*true\s*\}/
    )
    assert.match(vueSource, /:row-order\.prop="false"/)
    assert.match(reactSource, /rowOrder=\{false\}/)
    assert.match(vanillaSource, /grid\.rowOrder = false/)
    assert.match(angularSource, /\[rowOrder\]="false"/)
})

test('applies mapped planning patches by stable model IDs', () => {
    const tasks = createTasks()
    const task = tasks[1]
    const startDate = '2026-09-20T09:00:00.000Z'
    const endDate = '2026-09-20T13:00:00.000Z'
    const updated = updateFromPlanningEdit(tasks, {
        data: {
            0: {
                id: 'ignored-replacement-id',
                name: 'Mapped task',
                workflowStatus: 'blocked',
                startDate,
                endDate,
                color: '#123456',
                percentDone: 73,
                owner: 'Leo',
            },
        },
        models: { 0: task },
    } as Parameters<typeof updateFromPlanningEdit>[1])
    const edited = updated.find(({ id }) => id === task.id)!

    assert.equal(edited.name, 'Mapped task')
    assert.equal(edited.id, task.id)
    assert.equal(updated.some(({ id }) => id === 'ignored-replacement-id'), false)
    assert.equal(edited.workflowStatus, 'blocked')
    assert.equal(edited.startDate, startDate)
    assert.equal(edited.endDate, endDate)
    assert.equal(edited.color, '#123456')
    assert.equal(edited.percentDone, 73)
    assert.equal(edited.owner, 'Leo')
    assert.equal(edited.ownerAvatar, getOwnerAvatar('Leo'))
    assert.equal(edited.ownerAvatarIndex, 3)
    assert.equal(edited.duration, 4)
    assert.equal(updated[0], tasks[0])
})

test('falls back to a patch ID and merges multiple authored patches', () => {
    const tasks = createTasks()
    const task = tasks[2]
    const updated = updateFromPlanningEdit(tasks, {
        data: {
            0: { id: task.id, name: 'First title' },
            1: { id: task.id, name: 'Final title', percentDone: 42 },
        },
    } as Parameters<typeof updateFromPlanningEdit>[1])

    assert.equal(updated[2].name, 'Final title')
    assert.equal(updated[2].percentDone, 42)
})

test('ignores malformed authored planning patches', () => {
    const tasks = createTasks()
    assert.equal(updateFromPlanningEdit(tasks, {}), tasks)
    assert.equal(
        updateFromPlanningEdit(tasks, {
            data: { 0: null, 1: [], 2: { name: 'Missing ID' } },
        } as Parameters<typeof updateFromPlanningEdit>[1]),
        tasks
    )
})

test('recalculates elapsed duration safely for mapped date patches', () => {
    const tasks = createTasks()
    const task = tasks.find(({ type }) => type === 'task')!
    const milestone = tasks.find(({ type }) => type === 'milestone')!
    const updated = updateFromPlanningEdit(tasks, {
        data: {
            0: { endDate: 'invalid' },
            1: { endDate: '2026-09-30T18:00:00.000Z' },
        },
        models: { 0: task, 1: milestone },
    } as Parameters<typeof updateFromPlanningEdit>[1])

    assert.equal(updated.find(({ id }) => id === task.id)?.duration, 0)
    assert.equal(updated.find(({ id }) => id === milestone.id)?.duration, 0)
})

test('keeps mapped date patches valid for every planning view', () => {
    const tasks = createTasks()
    const milestone = tasks.find(({ type }) => type === 'milestone')!
    const updated = updateFromPlanningEdit(tasks, {
        data: { 0: { endDate: milestone.startDate } },
        models: { 0: milestone },
    } as Parameters<typeof updateFromPlanningEdit>[1])
    const next = updated.find(({ id }) => id === milestone.id)!

    assert.equal(next.duration, 0)
    assert.equal(Date.parse(next.endDate) - Date.parse(next.startDate), 3_600_000)
})

test('commits mapped patches without mutating an already published view snapshot', () => {
    const initial = createTasks()
    const store = new PlanningWorkspaceStore(initial)
    const published = store.createSnapshot()
    const task = initial[0]

    store.commitPlanningEdit({
        data: { 0: { name: 'Updated title' } },
        models: { 0: task },
    } as Parameters<PlanningWorkspaceStore['commitPlanningEdit']>[0])

    assert.equal(published[0].name, task.name)

    const next = store.createSnapshot()
    assert.equal(next[0].name, 'Updated title')
})

test('does not echo committed planning edits into the active framework source', () => {
    const frameworkSources = [
        vueWorkspaceSource,
        reactSource,
        angularSource,
        vanillaSource,
    ]

    for (const source of frameworkSources) {
        assert.match(source, /commitPlanningEdit\([\s\S]{0,80}event\.detail/)
    }
    assert.doesNotMatch(
        vueWorkspaceSource,
        /tasks\.value\s*=\s*updateFromPlanningEdit/
    )
    assert.doesNotMatch(
        reactSource,
        /setTasks\([\s\S]{0,80}updateFromPlanningEdit/
    )
    assert.doesNotMatch(
        angularSource,
        /(?:this\.)?setTasks\([\s\S]{0,80}updateFromPlanningEdit/
    )
})

test('keeps Angular planning projections as stable snapshot fields', () => {
    for (const property of [
        'visibleTasks',
        'ganttAssignments',
        'visibleGanttDependencies',
    ]) {
        assert.doesNotMatch(angularSource, new RegExp(`get ${property}\\(`))
    }
    assert.match(angularSource, /refreshViewSnapshot\(\)/)
})

test('uses one EventManager edit handler in every Pro planning view', () => {
    for (const source of [
        `${vueSource}\n${vueWorkspaceSource}`,
        vanillaSource,
        reactSource,
        angularSource,
    ]) {
        assert.match(source, /commitPlanningEdit/)
        assert.match(source, /gridedit/i)
        assert.doesNotMatch(
            source,
            /kanbancard(move|create|update|delete)|event-scheduler-event-changed|gantt-before-(task|assignment)-change/
        )
    }
})

test('passes only dependencies whose tasks are visible to Gantt', () => {
    const dependencies = [
        {
            id: 'visible',
            predecessorTaskId: 'task-001',
            successorTaskId: 'task-002',
            type: 'finish-to-start' as const,
            lagDays: 0,
        },
        {
            id: 'hidden-successor',
            predecessorTaskId: 'task-001',
            successorTaskId: 'task-003',
            type: 'finish-to-start' as const,
            lagDays: 0,
        },
    ]

    assert.deepEqual(
        filterGanttDependencies(dependencies, [
            { id: 'task-001' },
            { id: 'task-002' },
        ]),
        [dependencies[0]]
    )
    assert.match(vueSource, /:gantt-dependencies\.prop="visibleGanttDependencies"/)
    assert.match(vanillaSource, /grid\.ganttDependencies = visibleGanttDependencies/)
    assert.match(reactSource, /ganttDependencies=\{visibleGanttDependencies\}/)
    assert.match(angularSource, /\[ganttDependencies\]="visibleGanttDependencies"/)
})

test('uses declarative data-grid formats for every planning value type', () => {
    assert.match(formattingSource, /name:\s*text/)
    assert.match(
        formattingSource,
        /owner:\s*\{[\s\S]*?id:\s*'avatar-with-text'[\s\S]*?avatarSize:\s*18/
    )
    assert.match(formattingSource, /id:\s*'workflow-status-badge'/)
    assert.match(formattingSource, /id:\s*'planning-priority-indicator'/)
    assert.match(
        formattingSource,
        /fill: '--planning-priority-color'[\s\S]*?text: '--planning-priority-label-color'/
    )
    assert.match(formattingSource, /export const workflowStatusBadgeRenderer/)
    assert.match(
        columnsSource,
        /prop: 'workflowStatus'[\s\S]*?syncCellTemplate: true,[\s\S]*?cellTemplate: workflowStatusBadgeRenderer/
    )
    assert.match(
        columnsSource,
        /prop: 'workflowStatus'[\s\S]*?dataGridFormat: planningGridFormats\.workflowStatus/
    )
    assert.match(
        columnsSource,
        /prop: 'owner'[\s\S]*?avatarProp: 'ownerAvatar'[\s\S]*?avatarIndexProp: 'ownerAvatarIndex'/
    )
    assert.match(columnsSource, /ownerAvatar:\s*getOwnerAvatar\(id\)/)
    assert.match(
        columnsSource,
        /prop: 'owner'[\s\S]*?dropdown: \{[\s\S]*?cellTemplate: ownerAvatarRenderer/
    )
    assert.match(
        columnsSource,
        /prop: 'owner'[\s\S]*?dataGridFormat: planningGridFormats\.owner/
    )
    assert.match(
        formattingSource,
        /customFormats:\s*\[workflowStatusBadgeFormat, priorityIndicatorFormat\]/
    )
    assert.match(
        columnsSource,
        /prop: 'priority',[\s\S]*?size: 110[\s\S]*?cellProperties: paddedCellProperties[\s\S]*?dataGridFormat: planningGridFormats.priority/
    )
    assert.match(formattingSource, /preset:\s*'date'[\s\S]*?timeZone:\s*'UTC'/)
    assert.match(
        formattingSource,
        /preset:\s*'number'[\s\S]*?id:\s*'progress-line'/
    )
    assert.match(formattingSource, /id:\s*'progress-line'/)
    assert.match(
        formattingSource,
        /preset:\s*'currency'[\s\S]*?currency:\s*'USD'/
    )
    assert.match(
        formattingSource,
        /preset:\s*'datetime'[\s\S]*?dateStyle:\s*'short'[\s\S]*?timeZone:\s*'UTC'/
    )
    for (const prop of [
        'name',
        'owner',
        'priority',
        'endDate',
        'budget',
        'activityAt',
    ]) {
        assert.match(
            columnsSource,
            new RegExp(`dataGridFormat: planningGridFormats\\.${prop}`)
        )
    }
    assert.match(
        vueSource,
        /:data-grid-formatting\.prop="planningDataGridFormatting"/
    )
    assert.match(
        vueSource,
        /:data-grid-context-menu\.prop="planningDataGridContextMenu"/
    )
})

test('pads owner and status cell content without changing global grid styles', () => {
    assert.match(
        columnsSource,
        /const paddedCellProperties[\s\S]*?padding: '0 16px'/
    )
    assert.match(
        columnsSource,
        /prop: 'owner'[\s\S]*?cellProperties: paddedCellProperties/
    )
    assert.match(
        columnsSource,
        /prop: 'workflowStatus'[\s\S]*?cellProperties: paddedCellProperties/
    )
})

test('keeps formatting and range selections inside Planning Grid columns', () => {
    assert.match(
        formattingSource,
        /protectedColumnProps:\s*\[[\s\S]*?'name',[\s\S]*?'owner',[\s\S]*?'workflowStatus',[\s\S]*?'priority',[\s\S]*?'endDate',[\s\S]*?'percentDone',[\s\S]*?'budget',[\s\S]*?'activityAt'/
    )

    assert.match(vueWorkspaceSource, /RangeSelectionLimitPlugin/)
    assert.match(
        vueSource,
        /:range-selection-limit\.prop="'column'"/
    )

    assert.match(vanillaSource, /RangeSelectionLimitPlugin/)
    assert.match(vanillaSource, /grid\.rangeSelectionLimit = 'column'/)

    assert.match(reactSource, /RangeSelectionLimitPlugin/)
    assert.match(reactSource, /rangeSelectionLimit="column"/)

    assert.match(angularSource, /RangeSelectionLimitPlugin/)
    assert.match(angularSource, /\[rangeSelectionLimit\]="'column'"/)
})

test('keeps quick search in a stable native input', () => {
    assert.match(
        vueSource,
        /<label class="planning-demo__filter-search">[\s\S]*?v-model="quickSearch"/
    )
    assert.doesNotMatch(vueSource, /createElement\('input'\)/)
    assert.match(stylesSource, /planning-demo__filter-search:before/)
    assert.match(stylesSource, /planning-demo__filter-search:after/)
    assert.match(
        stylesSource,
        /planning-demo__filter-search:focus-within\s*\{[^}]*border-color:\s*var\(--demo-focus-color\)[^}]*box-shadow:\s*0 0 0 3px var\(--demo-focus-ring\)/
    )
    assert.doesNotMatch(
        stylesSource,
        /planning-demo__filter-search:focus-within\s*\{[^}]*currentColor/
    )
    assert.match(vueSource, /class="planning-demo__filter-row"/)
    assert.match(
        stylesSource,
        /planning-demo__filter-row\s*\{[^}]*display:\s*flex[^}]*padding-bottom:\s*6px[^}]*border-bottom:\s*1px solid var\(--rv-ui-border\)/
    )
    assert.match(
        stylesSource,
        /planning-demo__filter-badges\[role='status'\]\s*\{[^}]*display:\s*none/
    )
})

test('uses one focus treatment for sidebar search, quick search, and row checkboxes', () => {
    assert.match(
        siteStylesSource,
        /--demo-focus-color:\s*var\(--vp-c-brand-1\)[\s\S]*?--demo-focus-ring:\s*color-mix/
    )
    assert.match(
        stylesSource,
        /--revo-row-select-checkbox-focus:\s*var\(--demo-focus-ring\)/
    )
    assert.match(
        stylesSource,
        /planning-demo__filter-search:focus-within\s*\{[^}]*border-color:\s*var\(--demo-focus-color\)[^}]*box-shadow:\s*0 0 0 3px var\(--demo-focus-ring\)/
    )
    assert.match(
        demoNavigationSource,
        /demo-nav\s*>\s*label:focus-within\s*\{[^}]*border-color:\s*var\(--demo-focus-color\)[^}]*box-shadow:\s*0 0 0 3px var\(--demo-focus-ring\)/
    )
    assert.match(
        demoNavigationSource,
        /demo-nav\s*>\s*label:focus-within\s*\{[^}]*outline:\s*0/
    )
})

test('stretches grid columns through the public Pro plugin in every framework', () => {
    const workspaceSource = readFileSync(
        new URL('../src/composables/usePlanningWorkspace.ts', import.meta.url),
        'utf8'
    )
    assert.match(workspaceSource, /ColumnStretchPlugin/)
    assert.match(vueSource, /:stretch="1"/)
    const frameworkSources = [
        readFileSync(new URL('../src/planning.ts', import.meta.url), 'utf8'),
        readFileSync(
            new URL('../src/planning.react.tsx', import.meta.url),
            'utf8'
        ),
        readFileSync(
            new URL('../src/planning.angular.ts', import.meta.url),
            'utf8'
        ),
    ]
    for (const source of frameworkSources) {
        assert.match(source, /ColumnStretchPlugin/)
        assert.match(source, /stretch[^\n]{0,16}1/)
    }
})

test('inherits the site font family instead of overriding it in the workspace', () => {
    assert.doesNotMatch(stylesSource, /font(?:-family)?:[^;}]*Geist/)
})

test('keeps plan labeling at page level instead of repeating it in view tabs', () => {
    assert.doesNotMatch(stylesSource, /planning-demo__pro/)
})

test('uses direct workspace actions without a custom actions menu', () => {
    const workspaceSource = readFileSync(
        new URL('../src/composables/usePlanningWorkspace.ts', import.meta.url),
        'utf8'
    )
    assert.match(
        vueSource,
        /class="planning-demo__fullscreen"[\s\S]*?aria-label="Full screen"[\s\S]*?<span aria-hidden="true">↗<\/span>/
    )
    assert.doesNotMatch(vueSource, /<details|More/)
    assert.match(vueSource, />\s*Active tasks\s*</)
    assert.match(vueSource, />\s*Reset\s*</)
    assert.doesNotMatch(vueSource, /Double-click a cell to edit|showHint/)
    assert.doesNotMatch(workspaceSource, /showHint/)
    assert.doesNotMatch(stylesSource, /planning-demo__hint/)
    assert.doesNotMatch(
        workspaceSource,
        /moreMenuRef|closePopovers|resetKey/
    )
})

test('keeps native Grid filters mounted across planning view switches', () => {
    const workspaceSource = readFileSync(
        new URL('../src/composables/usePlanningWorkspace.ts', import.meta.url),
        'utf8'
    )
    assert.match(vueSource, /v-show="activeView === 'grid'"/)
    assert.match(vueSource, /class="planning-demo__grid-stage"/)
    assert.doesNotMatch(vueSource, /v-if="activeView === 'grid'"/)
    assert.match(vueSource, /:columns="gridColumns"/)
    assert.doesNotMatch(vueSource, /hide-columns/)
    assert.match(vueSource, /:plugins="gridPlugins"/)
    assert.match(workspaceSource, /FilterHeaderPlugin/)
    assert.doesNotMatch(workspaceSource, /displayedGridPlugins|showInlineFilters/)
    assert.doesNotMatch(vueSource, /Column filters|toggleColumnFilters/)
})

test('keeps filter badges owned by the filtering plugin', () => {
    const workspaceSource = readFileSync(
        new URL('../src/composables/usePlanningWorkspace.ts', import.meta.url),
        'utf8'
    )
    assert.match(vueSource, /:filter-badges\.prop="filterBadgeOptions"/)
    assert.doesNotMatch(vueSource, /filterBadgesRef|filter-badge-host|ref="gridRef"/)
    assert.doesNotMatch(
        workspaceSource,
        /gridRef|gridElement|moveFilterBadges|querySelector|append\(/
    )
    assert.doesNotMatch(vueSource, /planning-demo__filter-status/)
})

test('keeps milestones scheduler-valid in the shared task source', () => {
    const milestone = createTasks().find(({ type }) => type === 'milestone')!

    assert.equal(milestone.duration, 0)
    assert.equal(
        Date.parse(milestone.endDate) - Date.parse(milestone.startDate),
        3_600_000
    )
    assert.doesNotMatch(planningSource, /project|projection/i)
})

test('keeps the normal page surface and text color in fullscreen mode', () => {
    assert.match(
        stylesSource,
        /\.planning-demo:fullscreen\s*\{[^}]*background:\s*var\(--vp-c-bg\)[^}]*color:\s*var\(--vp-c-text-1\)/
    )
})

test('uses one compact owner renderer for Grid cells and dropdown options', () => {
    assert.match(
        stylesSource,
        /\.planning-demo \.avatar-cell > \.avatar-cell__image\s*\{[^}]*width:\s*var\(--avatar-cell-size\)[^}]*height:\s*var\(--avatar-cell-size\)[^}]*margin:\s*0[^}]*object-fit:\s*cover[^}]*object-position:\s*center/
    )
    assert.match(
        columnsSource,
        /const ownerAvatarRenderer[\s\S]*?ownerAvatar: getOwnerAvatar\(owner\)[\s\S]*?ownerAvatarIndex: getOwnerAvatarIndex\(owner\)/
    )
    assert.match(
        columnsSource,
        /prop: 'owner'[\s\S]*?avatarSize: 18,[\s\S]*?cellTemplate: ownerAvatarRenderer/
    )
})

test('renders Progress as a slider and Budget as a histogram brush', () => {
    assert.match(
        columnsSource,
        /\.\.\.percentDoneColumn[\s\S]*?filter: \[FIlTER_SLIDER\][\s\S]*?min: 0[\s\S]*?max: 100[\s\S]*?step: 5/
    )
    assert.match(
        columnsSource,
        /prop: 'budget',[\s\S]*?name: 'Budget',[\s\S]*?size: 106,[\s\S]*?filter: \[FILTER_HISTOGRAM_BRUSH\][\s\S]*?dataGridFormat: planningGridFormats\.budget/
    )
    assert.doesNotMatch(columnsSource, /FILTER_RATING_PROGRESS_THRESHOLD/)
})

test('provides a stable 100-task fixture across three projects', () => {
    const tasks = createTasks()
    assert.equal(tasks.length, 100)
    assert.equal(new Set(tasks.map(({ id }) => id)).size, 100)
    assert.deepEqual(
        [...new Set(tasks.map(({ projectId }) => projectId))].sort(),
        ['billing-platform', 'customer-portal', 'internal-tools']
    )
    assert.ok(tasks.every(({ startDate }) => startDate.startsWith('2026-09-')))
    assert.ok(
        new Set(tasks.map(({ startDate }) => startDate.slice(0, 10))).size <
            tasks.length
    )
    assert.ok(new Set(tasks.map(({ startDate }) => startDate)).size > 15)
    const milestones = tasks.filter(({ type }) => type === 'milestone')
    assert.equal(milestones.length, 4)
    assert.ok(
        milestones.every(({ startDate, endDate, duration }) =>
            Date.parse(endDate) - Date.parse(startDate) === 3_600_000 &&
            duration === 0
        )
    )
    assert.ok(
        tasks.every(({ activityAt }) => activityAt.startsWith('2026-09-'))
    )
    assert.ok(
        new Set(tasks.map(({ activityAt }) => activityAt.slice(11, 16))).size >
            5
    )
})

test('uses varied multi-day work with parallel owner schedules', () => {
    const tasks = createTasks()
    const regularTasks = tasks.filter(({ type }) => type !== 'milestone')
    assert.ok(regularTasks.every(({ duration, durationIsElapsed }) =>
        typeof duration === 'number' && duration > 0 && durationIsElapsed === true
    ))
    assert.ok(
        regularTasks.every(({ startDate, endDate }) => {
            const start = new Date(startDate)
            const end = new Date(endDate)
            return (
                start.getUTCDay() > 0 &&
                start.getUTCDay() < 6 &&
                start.getUTCHours() >= 8 &&
                end.getUTCHours() <= 17 &&
                end > start
            )
        })
    )
    assert.ok(
        new Set(regularTasks.map(({ startDate }) => startDate)).size <
            regularTasks.length
    )
    assert.match(planningSource, /ganttDependencies: DependencyEntity\[]/)
    assert.equal(
        (planningSource.match(/\['task-\d+', 'task-\d+'\]/g) ?? []).length,
        5
    )
})

test('uses local portrait assets for every shared owner', () => {
    const tasks = createTasks()
    assert.strictEqual(schedulerResources, planningPeople)
    assert.equal(
        planningPeople.every((person) => Boolean(person.color)),
        true
    )
    assert.equal(
        planningPeople.every((person) =>
            person.avatarUrl?.includes('/assets/avatars/')
        ),
        true
    )
    assert.equal(
        tasks.every((task) => task.ownerAvatarIndex >= 1),
        true
    )
    assert.equal(
        tasks.every((task) => task.ownerAvatar.endsWith('.webp')),
        true
    )
})

test('uses every canonical planning person in the Kanban assignee picker', () => {
    assert.deepEqual(createKanbanConfig().resources, planningPeople)
})

test('combines search, project, status and priority filters', () => {
    const tasks = createTasks()
    const matching = filterPlanningTasks(tasks, {
        query: 'maya',
        projectId: 'customer-portal',
        statuses: ['done'],
        priorities: [500],
    })
    assert.ok(matching.length > 0)
    assert.ok(
        matching.every(
            (task) =>
                task.owner === 'Maya' &&
                task.projectId === 'customer-portal' &&
                task.workflowStatus === 'done' &&
                task.priority === 500
        )
    )
    assert.equal(filterPlanningTasks(tasks, defaultPlanningFilters()).length, 100)
    assert.equal(filterPlanningTasks(tasks, activePlanningFilters()).length, 60)
})

test('maps priority filter choices to the formatted Priority column labels', () => {
    assert.match(
        columnsSource,
        /getItems:\s*\{[\s\S]*?priority:\s*\(\)\s*=>\s*priorityFilterItems/
    )
    assert.match(
        columnsSource,
        /itemTemplate:\s*\{[\s\S]*?priority:\s*priorityFilterItemTemplate/
    )
    assert.match(columnsSource, /value:\s*'500',\s*label:\s*'Normal'/)
    assert.match(columnsSource, /value:\s*'700',\s*label:\s*'High'/)
    assert.match(columnsSource, /value:\s*'900',\s*label:\s*'Critical'/)
})

test('uses restrained Status badge defaults with readable labels', () => {
    assert.match(
        structuredSource,
        /'not-started':\s*\{\s*label:\s*'Planned',\s*color:\s*'#59697c'/
    )
    assert.match(
        structuredSource,
        /'in-progress':\s*\{\s*label:\s*'In progress',\s*color:\s*'#5864b8'/
    )
    assert.match(
        structuredSource,
        /blocked:\s*\{\s*label:\s*'Blocked',\s*color:\s*'#a84f4f'/
    )
    assert.match(
        structuredSource,
        /done:\s*\{\s*label:\s*'Done',\s*color:\s*'#467a62'/
    )
    assert.match(
        formattingSource,
        /colorVariables:\s*\{[\s\S]*?fill:\s*'--badge-cell-appearance-background-color'[\s\S]*?text:\s*'--badge-cell-appearance-color'/
    )
    assert.match(formattingSource, /class:\s*'badge-cell'/)
    assert.match(
        formattingSource,
        /backgroundColor:\s*`var\(--badge-cell-appearance-background-color, \$\{color\}\)`/
    )
    assert.match(
        formattingSource,
        /color:\s*'var\(--badge-cell-appearance-color, #ffffff\)'/
    )
})

test('applies filtered and sorted edits only by stable task ID', () => {
    const tasks = createTasks()
    const visible = [
        ...filterPlanningTasks(tasks, {
            ...defaultPlanningFilters(),
            projectId: 'billing-platform',
        }),
    ].sort((a, b) => b.name.localeCompare(a.name))
    const edited = visible[0]
    const next = updateFromPlanningEdit(tasks, {
        data: { 0: { workflowStatus: 'blocked' } },
        models: { 0: edited },
    })
    assert.equal(
        next.find(({ id }) => id === edited.id)?.workflowStatus,
        'blocked'
    )
    assert.equal(next.filter((task, index) => task !== tasks[index]).length, 1)
    assert.equal(
        updateFromPlanningEdit(tasks, {
            data: { 0: { name: 'Wrong task' } },
            models: {},
        }),
        tasks
    )
})

test('merges visible Kanban changes without removing hidden tasks', () => {
    const tasks = createTasks()
    const visible = filterPlanningTasks(tasks, {
        ...defaultPlanningFilters(),
        projectId: 'internal-tools',
    })
    const movedCard = { ...visible[0], workflowStatus: 'done' }
    const moved = visible.map((task) =>
        task.id === movedCard.id ? movedCard : task
    )
    const merged = mergeVisibleTasks(tasks, moved)
    assert.equal(merged.length, 100)
    assert.equal(
        merged.find(({ id }) => id === movedCard.id)?.workflowStatus,
        'done'
    )
    assert.deepEqual(
        merged.filter(({ projectId }) => projectId !== 'internal-tools'),
        tasks.filter(({ projectId }) => projectId !== 'internal-tools')
    )
})

test('deletes every selected task from the canonical workspace', () => {
    const tasks = createTasks()
    const deleted = [tasks[2].id, tasks[3].id, tasks[4].id]
    const remaining = deletePlanningTasks(tasks, deleted)

    assert.equal(remaining.length, tasks.length - deleted.length)
    assert.equal(remaining.some(({ id }) => deleted.includes(id)), false)
})

test('reads visible rows and clears selection through the planning plugin', async () => {
    const visible = createTasks().slice(2, 5)
    let clearedType = ''
    const plugin = Object.assign(
        Object.create(PlanningWorkspacePlugin.prototype),
        {
            getVisibleSource: () => visible,
            providers: {
                plugins: {
                    getByClass: () => ({
                        clearSelection(type: string) {
                            clearedType = type
                        },
                    }),
                },
            },
        }
    ) as PlanningWorkspacePlugin
    const event = {
        currentTarget: { getPlugins: async () => [plugin] },
    } as unknown as Event

    assert.deepEqual(await getPlanningVisibleSource(event), visible)
    plugin.clearRowSelection()
    assert.equal(clearedType, 'rgRow')
})

test('synchronizes a grid status edit into the Kanban source', () => {
    const tasks = createTasks()
    const edited = updateFromPlanningEdit(tasks, {
        data: { 4: { workflowStatus: 'blocked' } },
        models: { 4: tasks[4] },
    })
    assert.equal(
        edited.find((task) => task.id === tasks[4].id)?.workflowStatus,
        'blocked'
    )
})

test('synchronizes a mapped owner edit into the Gantt assignment source', () => {
    const tasks = createTasks()
    const rowIndex = 2
    const edited = updateFromPlanningEdit(tasks, {
        data: { [rowIndex]: { owner: 'Ava' } },
        models: { [rowIndex]: tasks[rowIndex] },
    })

    const task = edited.find(({ id }) => id === tasks[rowIndex].id)
    assert.equal(task?.owner, 'Ava')
    assert.deepEqual(
        toGanttAssignments(edited).find(({ taskId }) => taskId === task?.id)
            ?.resourceId,
        'Ava'
    )
})

test('maps a Gantt progress-handle edit onto the authored progress field', () => {
    const tasks = createTasks()
    const task = tasks[2]
    const updated = updateFromPlanningEdit(tasks, {
        data: { 0: { progressPercent: 73 } },
        models: { 0: task },
    } as Parameters<typeof updateFromPlanningEdit>[1])

    const edited = updated.find(({ id }) => id === task.id)!
    assert.equal(edited.percentDone, 73)
    assert.equal('progressPercent' in edited, false)
})

test('receives Gantt progress edits through the authored progress field', () => {
    const ganttPluginSource = readFileSync(
        new URL(
            '../../../../../packages/gantt/src/gantt/grid/gantt-plugin.ts',
            import.meta.url
        ),
        'utf8'
    )

    const taskMutationHandler = ganttPluginSource.match(
        /collectTaskMutation: \(detail,[\s\S]*?this\.collectEdit\(withGanttDomainChanges\(detail, domainChanges\)\);/
    )?.[0]

    assert.ok(taskMutationHandler)
    assert.match(taskMutationHandler, /this\.translateGridEditDetailToAuthored\(detail\)/)
    assert.match(
        ganttPluginSource,
        /getAuthoredGanttTaskField\(field, this\.sourceFields\)/
    )
})

test('uses the unified EventManager edit stream for Grid in every framework', () => {
    assert.match(vueSource, /@gridedit="handlePlanningEdit"/)
    assert.doesNotMatch(vueSource, /@afteredit=/)
    for (const source of [vueWorkspaceSource, vanillaSource, reactSource, angularSource]) {
        assert.match(source, /EventManagerPlugin/)
        assert.doesNotMatch(source, /commitGridEdit|handleGridEdit|PlanningGridEditDetail/)
    }
    assert.match(vanillaSource, /addEventListener\('gridedit'/)
    assert.match(reactSource, /onGridedit=\{handlePlanningEdit\}/)
    assert.match(angularSource, /\(gridedit\)="handlePlanningEdit\(\$event\)"/)
})

test('synchronizes every mounted planning view while an edit commits', () => {
    const handler = vanillaSource.match(
        /grid\.addEventListener\('gridedit',[\s\S]*?\}, \{ signal: activeGridAbort\.signal \}\)/
    )?.[0]

    assert.ok(handler)
    assert.match(handler, /planningStore\.commitPlanningEdit/)
    assert.match(handler, /syncActiveGrid\(\)/)
    assert.doesNotMatch(handler, /render\(activeView\)/)

    const frameworkEditHandlers = [
        [
            vueWorkspaceSource.match(/function handlePlanningEdit\([\s\S]*?\n    \}/)?.[0],
            /refreshViewSnapshot\(\)/,
        ],
        [
            reactSource.match(/const handlePlanningEdit = \([\s\S]*?\n    \}/)?.[0],
            /setTasks\(planningStore\.createSnapshot\(\)\)/,
        ],
        [
            angularSource.match(/\n    handlePlanningEdit\([\s\S]*?\n    \}/)?.[0],
            /this\.refreshViewSnapshot\(\)/,
        ],
    ]

    for (const [frameworkHandler, expectedSynchronization] of frameworkEditHandlers) {
        assert.ok(frameworkHandler)
        assert.match(frameworkHandler, /planningStore\.commitPlanningEdit/)
        assert.match(frameworkHandler, expectedSynchronization)
    }
})

test('synchronizes Vanilla planning actions without reconstructing the active view', () => {
    assert.match(vanillaSource, /function syncActiveGrid\(\)/)
    assert.match(vanillaSource, /activeGrid\.source = allTasks/)
    assert.match(vanillaSource, /activeGrid\.ganttAssignments = toGanttAssignments\(allTasks\)/)
    assert.match(vanillaSource, /activeGrid\.ganttDependencies = filterGanttDependencies/)

    for (const action of ['input', 'change', 'click']) {
        assert.match(vanillaSource, new RegExp(`addEventListener\\('${action}'`))
    }
    const searchHandler = vanillaSource.match(
        /search\.addEventListener\('input',[\s\S]*?\n    \}\)/
    )?.[0]
    const resetHandler = vanillaSource.match(
        /reset\.addEventListener\('click',[\s\S]*?\n    \}\)/
    )?.[0]

    assert.ok(searchHandler)
    assert.ok(resetHandler)
    assert.match(searchHandler, /syncActiveGrid\(\)/)
    assert.match(resetHandler, /syncActiveGrid\(\)/)
    assert.doesNotMatch(searchHandler, /render\(activeView\)/)
    assert.doesNotMatch(resetHandler, /render\(activeView\)/)
})

test('synchronizes EventManager-derived fields onto the authored row model', () => {
    const tasks = createTasks()
    const row = { ...tasks[2] }
    const edited = updateFromPlanningEdit(tasks, {
        data: { 2: { owner: 'Leo' } },
        models: { 2: row },
    })

    assert.equal(edited[2].ownerAvatar, getOwnerAvatar('Leo'))
    assert.equal(row.owner, 'Leo')
    assert.equal(row.ownerAvatarIndex, 3)
    assert.equal(row.ownerAvatar, getOwnerAvatar('Leo'))
})

test('routes context-menu row deletion through the shared task source', () => {
    const workspaceSource = readFileSync(
        new URL('../src/composables/usePlanningWorkspace.ts', import.meta.url),
        'utf8'
    )
    for (const source of [
        workspaceSource,
        vanillaSource,
        reactSource,
        angularSource,
    ]) {
        assert.match(source, /createPlanningDataGridContextMenu/)
        assert.match(source, /planningStore\.delete\(taskIds\)/)
        assert.doesNotMatch(source, /gridRef|clearPlanningRowSelection/)
    }
    assert.match(formattingSource, /getByClass\(PlanningWorkspacePlugin\)/)
    assert.match(formattingSource, /clearRowSelection\(\)/)
})

test('reconciles a filtered mapped Kanban patch into canonical tasks', () => {
    const tasks = createTasks()
    const visible = filterPlanningTasks(tasks, {
        ...defaultPlanningFilters(),
        projectId: 'billing-platform',
    })
    const card = { ...visible[0], workflowStatus: 'done' }
    const next = updateFromPlanningEdit(tasks, {
        data: { 0: { workflowStatus: card.workflowStatus } },
        models: { 0: visible[0] },
    } as Parameters<typeof updateFromPlanningEdit>[1])
    assert.equal(
        next.find((task) => task.id === card.id)?.workflowStatus,
        'done'
    )
    assert.deepEqual(
        next.filter((task) => task.projectId !== 'billing-platform'),
        tasks.filter((task) => task.projectId !== 'billing-platform')
    )
})

test('reset fixtures and filters restore deterministic defaults', () => {
    const initial = createTasks()
    const edited = updateFromPlanningEdit(initial, {
        data: { 0: { name: 'Changed' } },
        models: { 0: { ...initial[0] } },
    })
    assert.notDeepEqual(edited, initial)
    assert.deepEqual(createTasks(), initial)
    assert.deepEqual(defaultPlanningFilters(), {
        query: '',
        projectId: 'all',
        statuses: [],
        priorities: [],
    })
    assert.deepEqual(activePlanningFilters().statuses, [
        'in-progress',
        'blocked',
        'not-started',
    ])
})

test('opens timeline views on the fixed fixture window', () => {
    assert.match(ganttConfigSource, /id:\s*'day-week-medium'/)
    assert.match(ganttConfigSource, /tickWidth:\s*100/)
    assert.match(
        ganttConfigSource,
        /defaultLevelId:\s*dayWeekMediumZoomLevel\.id/
    )
    assert.match(
        ganttConfigSource,
        /level\.id === 'day-week' \? \[dayWeekMediumZoomLevel, level\]/
    )
    assert.match(ganttConfigSource, /timelinePrecision:\s*'day'/)
    assert.match(schedulerConfigSource, /view:\s*'month'/)
    assert.match(
        schedulerConfigSource,
        /dateRange:\s*\{ start: '2026-09-01', end: '2026-09-30' \}/
    )
})

test('keeps Scheduler movable while Calendar is read-only and does not select empty days', () => {
    assert.match(
        schedulerConfigSource,
        /schedulerConfig:[\s\S]*?editable:\s*true[\s\S]*?allowMove:\s*true/
    )
    assert.match(
        schedulerConfigSource,
        /calendarConfig:[\s\S]*?editable:\s*false[\s\S]*?beforeSlotSelect:\s*\(\)\s*=>\s*false/
    )
})

test('keeps all four Kanban columns compact enough for the workspace', () => {
    const columns = [
        ...kanbanConfigSource.matchAll(
            /name:\s*'[^']+',\s*size:\s*(\d+),\s*minSize:\s*(\d+)/g
        ),
    ]
    assert.equal(columns.length, 4)
    assert.equal(
        columns.every(
            ([, size, minSize]) =>
                Number(size) >= Number(minSize) && Number(minSize) === 216
        ),
        true
    )
    assert.equal(
        columns.reduce((total, [, size]) => total + Number(size), 0),
        912
    )
})

test('renders Kanban ownership from the canonical owner and local portrait', () => {
    assert.match(
        kanbanConfigSource,
        /import \{ avatarTemplate \} from '@revolist\/revogrid-pro'/
    )
    assert.match(kanbanConfigSource, /planning-card__avatar-stack/)
    assert.doesNotMatch(kanbanConfigSource, /assigneeField/)
    assert.match(kanbanConfigSource, /index:\s*getOwnerAvatarIndex\(card\.owner\) - 1/)
    assert.match(kanbanConfigSource, /value:\s*getOwnerAvatar\(card\.owner\)/)
    assert.doesNotMatch(kanbanConfigSource, /card\.owners/)
    assert.doesNotMatch(planningSource, /ownerAvatars/)
    assert.match(planningSource, /resourceId:\s*task\.owner/)
    assert.doesNotMatch(planningSource, /task\.owners/)
    assert.match(
        stylesSource,
        /planning-card__title\s*\{[^}]*line-height:\s*20px/
    )
    assert.match(stylesSource, /planning-card__avatar-stack/)
})

test('uses the shared Pro progress renderer in Kanban cards', () => {
    assert.match(
        kanbanConfigSource,
        /import \{ renderKanbanProgress \} from '@revolist\/kanban'/
    )
    assert.match(
        kanbanConfigSource,
        /renderKanbanProgress\(\s*h,\s*\{\s*value:\s*card\.percentDone,\s*label:\s*'Progress',?\s*\}\s*\)/
    )
    assert.doesNotMatch(kanbanConfigSource, /planning-card__progress/)
    assert.match(kanbanConfigSource, /cardRowHeight: 144/)
})
