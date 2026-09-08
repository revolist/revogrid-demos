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
    applyPlanningGridEdit,
    defaultPlanningFilters,
    deletePlanningTasks,
    filterPlanningTasks,
    mergeVisibleTasks,
} from '../src/data/workspace'
import { clearPlanningRowSelection } from '../src/data/selection'
import {
    updateFromGrid,
    updateFromGridSource,
    updateFromKanban,
} from '../src/data/sync'
import { toSchedulerEvents } from '../src/data/source'
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

test('uses the Pro dropdown editor with canonical owner and status values', () => {
    assert.match(
        columnsSource,
        /gridColumnTypes\s*=\s*\{\s*dropdown:\s*ColumnDropdown/
    )
    assert.match(
        columnsSource,
        /prop:\s*'workflowStatus'[\s\S]*?columnType:\s*'dropdown'[\s\S]*?source:\s*workflowEditorOptions[\s\S]*?syncCellTemplate:\s*true/
    )
    assert.match(columnsSource, /'not-started':\s*'Planned'/)
    assert.match(columnsSource, /'in-progress':\s*'In progress'/)
    assert.match(columnsSource, /blocked:\s*'Blocked'/)
    assert.match(columnsSource, /done:\s*'Done'/)
    assert.match(vueSource, /:column-types="gridColumnTypes"/)
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

test('aligns the Gantt timeline with the planning fixture window', () => {
    assert.match(ganttConfigSource, /weekStartsOn: 1/)
    assert.match(
        ganttConfigSource,
        /timelineRange: \{ startDate: '2026-09-07', endDate: '2026-10-09' \}/
    )
})

test('uses declarative data-grid formats for every planning value type', () => {
    assert.match(formattingSource, /name:\s*text/)
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
        /prop: 'owner'[\s\S]*?avatarProp: 'ownerAvatar'[\s\S]*?avatarIndexProp: 'ownerAvatarIndex'/
    )
    assert.match(columnsSource, /ownerAvatar:\s*getOwnerAvatar\(id\)/)
    assert.match(
        columnsSource,
        /prop: 'owner'[\s\S]*?dropdown: \{[\s\S]*?cellTemplate: ownerAvatarRenderer/
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
        'workflowStatus',
        'priority',
        'endDate',
        'percentDone',
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
    assert.match(
        stylesSource,
        /planning-demo__filter-badges\s*\{[^}]*margin-bottom:\s*5px/
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
        /demo-nav>label:focus-within\{[^}]*border-color:var\(--demo-focus-color\)[^}]*box-shadow:0 0 0 3px var\(--demo-focus-ring\)/
    )
    assert.match(
        demoNavigationSource,
        /demo-nav>label:focus-within\{[^}]*outline:0/
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
        /class="planning-demo__fullscreen"[\s\S]*?aria-label="Full screen"[\s\S]*?name="expand"/
    )
    assert.doesNotMatch(vueSource, /<details|More/)
    assert.match(vueSource, />\s*Active tasks\s*</)
    assert.match(vueSource, />\s*Reset\s*</)
    assert.match(vueSource, /Double-click a cell to edit/)
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
    assert.match(vueSource, /:plugins="displayedGridPlugins"/)
    assert.match(
        workspaceSource,
        /gridPlugins\.filter\(\(plugin\) => plugin !== FilterHeaderPlugin\)/
    )
})

test('projects zero-duration Gantt milestones as valid scheduler events', () => {
    const tasks = createTasks()
    const schedulerEvents = toSchedulerEvents(tasks)

    assert.equal(schedulerEvents.length, tasks.length)
    for (const event of schedulerEvents) {
        assert.ok(
            Date.parse(event.endDateTime) > Date.parse(event.startDateTime),
            `${event.id} must end after it starts`
        )
    }
})

test('keeps the normal page surface and text color in fullscreen mode', () => {
    assert.match(
        stylesSource,
        /\.planning-demo:fullscreen\s*\{[^}]*background:\s*var\(--vp-c-bg\)[^}]*color:\s*var\(--vp-c-text-1\)/
    )
})

test('uses one compact owner renderer for Grid cells and dropdown options', () => {
    assert.doesNotMatch(stylesSource, /planning-demo__grid\s+revogr-/)
    assert.doesNotMatch(stylesSource, /planning-demo__grid\s+revo-grid/)
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
        /prop: 'owner'[\s\S]*?avatarSize: 20,[\s\S]*?cellTemplate: ownerAvatarRenderer/
    )
})

test('renders Progress as an inline slider filter', () => {
    assert.match(
        columnsSource,
        /\.\.\.percentDoneColumn[\s\S]*?filter: \[FIlTER_SLIDER\][\s\S]*?min: 0[\s\S]*?max: 100[\s\S]*?step: 5/
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
            startDate === endDate && duration === 0
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
    assert.deepEqual(
        [...new Set(regularTasks.map(({ duration }) => duration))].sort(),
        ['2d', '3d', '4d', '5d', '6d']
    )
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
    const next = applyPlanningGridEdit(tasks, {
        model: edited,
        prop: 'workflowStatus',
        val: 'blocked',
    })
    assert.equal(
        next.find(({ id }) => id === edited.id)?.workflowStatus,
        'blocked'
    )
    assert.equal(next.filter((task, index) => task !== tasks[index]).length, 1)
    assert.equal(
        applyPlanningGridEdit(tasks, { prop: 'name', val: 'Wrong task' }),
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

test('clears checkbox selection after deleting rows', async () => {
    let selectedType = ''
    let selectedIndexes: number[] | undefined
    const grid = {
        getPlugins: async () => [
            {
                setSelectedIndexes(type: string, indexes: Iterable<number>) {
                    selectedType = type
                    selectedIndexes = [...indexes]
                },
            },
        ],
    } as unknown as HTMLRevoGridElement

    await clearPlanningRowSelection(grid)

    assert.equal(selectedType, 'rgRow')
    assert.deepEqual(selectedIndexes, [])
})

test('synchronizes a grid status edit into the Kanban source', () => {
    const tasks = createTasks()
    const edited = applyPlanningGridEdit(tasks, {
        model: tasks[4],
        prop: 'workflowStatus',
        val: 'blocked',
    })
    assert.equal(
        edited.find((task) => task.id === tasks[4].id)?.workflowStatus,
        'blocked'
    )
})

test('synchronizes a dropdown owner edit without a model into the Gantt assignment source', () => {
    const tasks = createTasks()
    const rowIndex = 2
    const edited = updateFromGridSource(
        tasks,
        {
            rowIndex,
            prop: 'owner',
            val: 'Ava',
        },
        tasks
    )

    const task = edited.find(({ id }) => id === tasks[rowIndex].id)
    assert.equal(task?.owner, 'Ava')
    assert.deepEqual(task?.owners, ['Ava'])
})

test('keeps the canonical owner in sync for a dropdown option', () => {
    const tasks = createTasks()
    const edited = applyPlanningGridEdit(tasks, {
        model: tasks[2],
        prop: 'owner',
        val: { value: 'Leo', label: 'Leo' },
    })
    const task = edited.find(({ id }) => id === tasks[2].id)

    assert.equal(task?.owner, 'Leo')
    assert.deepEqual(task?.owners, ['Leo'])
    assert.equal(task?.ownerAvatarIndex, 3)
    assert.equal(task?.ownerAvatars.length, 1)
})

test('updates the edited grid row avatar with the selected owner', () => {
    const tasks = createTasks()
    const row = { ...tasks[2] }
    updateFromGrid(tasks, { model: row, prop: 'owner', val: 'Leo' })

    assert.equal(row.owner, 'Leo')
    assert.equal(row.ownerAvatarIndex, 3)
    assert.equal(row.ownerAvatar, getOwnerAvatar('Leo'))
})

test('uses the edited visible owner when a direct dropdown event has no value', () => {
    const tasks = createTasks()
    const rowIndex = 2
    const visible = tasks.map((task, index) =>
        index === rowIndex ? { ...task, owner: 'Leo' } : task
    )
    const edited = updateFromGridSource(
        tasks,
        { model: { id: tasks[rowIndex].id }, rowIndex, prop: 'owner' },
        visible
    )
    const task = edited.find(({ id }) => id === tasks[rowIndex].id)

    assert.equal(task?.owner, 'Leo')
    assert.deepEqual(task?.owners, ['Leo'])
})

test('uses the visible source fallback for direct grid editors in every framework', () => {
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
        assert.match(source, /updateFromGridSource/)
        assert.match(source, /getVisibleSource\(\)/)
    }
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
        assert.match(source, /deletePlanningTasks/)
        assert.match(source, /clearPlanningRowSelection/)
    }
})

test('reconciles a filtered Kanban move into canonical tasks', () => {
    const tasks = createTasks()
    const visible = filterPlanningTasks(tasks, {
        ...defaultPlanningFilters(),
        projectId: 'billing-platform',
    })
    const card = { ...visible[0], workflowStatus: 'done' }
    const next = updateFromKanban(tasks, { changedCards: [card] } as Parameters<
        typeof updateFromKanban
    >[1])
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
    const edited = applyPlanningGridEdit(initial, {
        model: initial[0],
        prop: 'name',
        val: 'Changed',
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
    assert.match(ganttConfigSource, /zoomPreset:\s*'day-week'/)
    assert.match(ganttConfigSource, /timelinePrecision:\s*'day'/)
    assert.match(schedulerConfigSource, /view:\s*'month'/)
    assert.match(
        schedulerConfigSource,
        /dateRange:\s*\{ start: '2026-09-01', end: '2026-09-30' \}/
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
    assert.match(kanbanConfigSource, /assigneeField:\s*'owner'/)
    assert.doesNotMatch(kanbanConfigSource, /assigneeField:\s*'owners'/)
    assert.match(
        kanbanConfigSource,
        /index:\s*Math\.max\(\s*getOwnerAvatarIndex\(card\.owner\) - 1,\s*0\s*\)/
    )
    assert.match(
        kanbanConfigSource,
        /value:\s*getOwnerAvatar\(card\.owner\)/
    )
    assert.doesNotMatch(kanbanConfigSource, /card\.owners/)
    assert.doesNotMatch(kanbanConfigSource, /card\.ownerAvatarIndex/)
    assert.match(planningSource, /task\.owner\s*\?\s*\[/)
    assert.match(planningSource, /resourceId:\s*task\.owner/)
    assert.doesNotMatch(planningSource, /task\.owners\.map/)
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
