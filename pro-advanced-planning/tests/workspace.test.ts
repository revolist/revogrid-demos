import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createTasks, planningPeople } from '../src/data/fixtures'
import { applyPlanningGridEdit, defaultPlanningFilters, filterPlanningTasks, mergeVisibleTasks } from '../src/data/workspace'
import { updateFromKanban } from '../src/data/sync'
const configSource = readFileSync(new URL('../src/data/config.ts', import.meta.url), 'utf8')
const columnsSource = readFileSync(new URL('../src/data/columns.ts', import.meta.url), 'utf8')
const formattingSource = readFileSync(new URL('../src/data/formatting.ts', import.meta.url), 'utf8')
const stylesSource = readFileSync(new URL('../src/planning.scss', import.meta.url), 'utf8')
const vueSource = readFileSync(new URL('../src/planning.vue', import.meta.url), 'utf8')

test('uses the Pro dropdown editor with canonical owner and status values', () => {
  assert.match(columnsSource, /gridColumnTypes\s*=\s*\{\s*dropdown:\s*ColumnDropdown/)
  assert.match(columnsSource, /prop:\s*'workflowStatus'[\s\S]*?columnType:\s*'dropdown'[\s\S]*?source:\s*workflowEditorOptions[\s\S]*?syncCellTemplate:\s*true/)
  assert.match(columnsSource, /'not-started':\s*'Planned'/)
  assert.match(columnsSource, /'in-progress':\s*'In progress'/)
  assert.match(columnsSource, /blocked:\s*'Blocked'/)
  assert.match(columnsSource, /done:\s*'Done'/)
  assert.match(vueSource, /:column-types="gridColumnTypes"/)
})

test('pins selection and task identity with space for native checkboxes', () => {
  assert.match(columnsSource, /prop: '_selected', name: '', size: 48, pin: 'colPinStart', rowSelect: true/)
  assert.match(columnsSource, /prop: 'name', name: 'Task', size: 220, pin: 'colPinStart'/)
})

test('allocates enough width for formatted due dates', () => {
  assert.match(columnsSource, /prop: 'endDate',[\s\S]*?name: 'Due date',[\s\S]*?size: 130/)
})

test('allocates enough width for formatted activity times', () => {
  assert.match(columnsSource, /prop: 'activityAt', name: 'Activity time', size: 173/)
})

test('keeps scheduler and calendar events free of conflict validation outlines', () => {
  assert.match(configSource, /conflicts: \{ enabled: false \}/)
})

test('uses declarative data-grid formats for every planning value type', () => {
  assert.match(formattingSource, /name:\s*text/)
  assert.match(formattingSource, /id:\s*'avatar-with-text'/)
  assert.match(formattingSource, /id:\s*'workflow-status-badge'/)
  assert.match(formattingSource, /workflowStatusBadgeStyles[\s\S]*?backgroundColor: color, color/)
  assert.match(columnsSource, /prop: 'workflowStatus'[\s\S]*?badgeStyles: workflowStatusBadgeStyles/)
  assert.match(columnsSource, /prop: 'owner'[\s\S]*?avatarIndexProp: 'ownerAvatarIndex'[\s\S]*?avatarLabelProp: 'owner'/)
  assert.match(formattingSource, /customFormats:\s*\[workflowStatusBadgeFormat\]/)
  assert.match(formattingSource, /preset:\s*'date'[\s\S]*?timeZone:\s*'UTC'/)
  assert.match(formattingSource, /preset:\s*'number'[\s\S]*?id:\s*'progress-line'/)
  assert.match(formattingSource, /id:\s*'progress-line'/)
  assert.match(formattingSource, /preset:\s*'currency'[\s\S]*?currency:\s*'USD'/)
  assert.match(formattingSource, /preset:\s*'datetime'[\s\S]*?timeZone:\s*'UTC'/)
  for (const prop of ['name', 'owner', 'workflowStatus', 'priority', 'endDate', 'percentDone', 'budget', 'activityAt']) {
    assert.match(columnsSource, new RegExp(`dataGridFormat: planningGridFormats\\.${prop}`))
  }
  assert.match(vueSource, /:data-grid-formatting\.prop="planningDataGridFormatting"/)
  assert.match(vueSource, /:data-grid-context-menu\.prop="planningDataGridContextMenu"/)
})

test('adds a search affordance to the quick-search filter slot', () => {
  const workspaceSource = readFileSync(new URL('../src/composables/usePlanningWorkspace.ts', import.meta.url), 'utf8')
  assert.match(workspaceSource, /field\.className = 'planning-demo__filter-search'/)
  assert.match(stylesSource, /planning-demo__filter-search:before/)
  assert.match(stylesSource, /planning-demo__filter-search:after/)
  assert.match(stylesSource, /planning-demo__filter-badges\{margin-bottom:5px\}/)
})

test('stretches grid columns through the public Pro plugin in every framework', () => {
  const workspaceSource = readFileSync(new URL('../src/composables/usePlanningWorkspace.ts', import.meta.url), 'utf8')
  assert.match(workspaceSource, /ColumnStretchPlugin/)
  assert.match(vueSource, /stretch="all"/)
  const frameworkSources = [
    readFileSync(new URL('../src/planning.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/planning.react.tsx', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/planning.angular.ts', import.meta.url), 'utf8'),
  ]
  for (const source of frameworkSources) {
    assert.match(source, /ColumnStretchPlugin/)
    assert.match(source, /stretch[^\n]{0,16}all/)
  }
})

test('inherits the site font family instead of overriding it in the workspace', () => {
  assert.doesNotMatch(stylesSource, /font(?:-family)?:[^;}]*Geist/)
})

test('matches view badges to the Pro Advanced plan badge', () => {
  assert.match(stylesSource, /planning-demo__pro\{[\s\S]*?border-radius:999px[\s\S]*?background:color-mix\(in srgb,var\(--vp-c-brand-1\) 14%,transparent\)[\s\S]*?font-size:\.72rem/)
})

test('uses a direct fullscreen icon without a custom actions menu', () => {
  const workspaceSource = readFileSync(new URL('../src/composables/usePlanningWorkspace.ts', import.meta.url), 'utf8')
  assert.match(vueSource, /class="planning-demo__fullscreen"[\s\S]*?aria-label="Full screen"[\s\S]*?name="expand"/)
  assert.doesNotMatch(vueSource, /<details|resetWorkspace|More/)
  assert.doesNotMatch(workspaceSource, /moreMenuRef|closePopovers|resetWorkspace|resetKey/)
})

test('keeps native grid internals unstyled and uses compact owner avatars', () => {
  assert.doesNotMatch(stylesSource, /planning-demo__grid\s+revogr-/)
  assert.doesNotMatch(stylesSource, /planning-demo__grid\s+revo-grid/)
  assert.match(columnsSource, /avatarSize: 16/)
  assert.match(formattingSource, /options: \{ avatarSize: 16, rectangular: false \}/)
})

test('provides a stable 100-task fixture across three projects', () => {
  const tasks = createTasks()
  assert.equal(tasks.length, 100)
  assert.equal(new Set(tasks.map(({ id }) => id)).size, 100)
  assert.deepEqual([...new Set(tasks.map(({ projectId }) => projectId))].sort(), [
    'billing-platform', 'customer-portal', 'internal-tools',
  ])
  assert.ok(tasks.every(({ startDate }) => startDate.startsWith('2026-09-')))
  assert.ok(new Set(tasks.map(({ startDate }) => startDate.slice(0, 10))).size < tasks.length)
  assert.ok(new Set(tasks.map(({ startDate }) => startDate)).size > 15)
  assert.ok(tasks.every(({ startDate, endDate }) => Date.parse(endDate) - Date.parse(startDate) >= 4 * 60 * 60 * 1000))
  assert.ok(tasks.every(({ activityAt }) => activityAt.startsWith('2026-09-')))
  assert.ok(new Set(tasks.map(({ activityAt }) => activityAt.slice(11, 16))).size > 5)
})

test('schedules each resource without overlapping task assignments', () => {
  const tasks = createTasks()
  const tasksByOwner = Map.groupBy(tasks, ({ owner }) => owner)

  for (const ownerTasks of tasksByOwner.values()) {
    const scheduled = [...ownerTasks].sort((left, right) => Date.parse(left.startDate) - Date.parse(right.startDate))
    assert.ok(scheduled.every(({ startDate, endDate }) => {
      const start = new Date(startDate)
      const end = new Date(endDate)
      return start.getUTCDay() > 0 && start.getUTCDay() < 6 && start.getUTCHours() >= 8 && end.getUTCHours() <= 17
    }))
    assert.ok(scheduled.slice(1).every((task, index) => Date.parse(task.startDate) >= Date.parse(scheduled[index].endDate)))
  }
})

test('uses deterministic local avatars for every shared owner', () => {
  const tasks = createTasks()
  assert.equal(planningPeople.every(person => Boolean(person.color)), true)
  assert.equal(tasks.every(task => task.ownerAvatar.startsWith('data:image/svg+xml,')), true)
  assert.equal(tasks.every(task => task.ownerAvatarIndex >= 1), true)
  assert.equal(tasks.some(task => task.ownerAvatar.startsWith('http')), false)
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
  assert.ok(matching.every(task => task.owner === 'Maya' && task.projectId === 'customer-portal' && task.workflowStatus === 'done' && task.priority === 500))
  assert.equal(filterPlanningTasks(tasks, defaultPlanningFilters()).length, 60)
})

test('applies filtered and sorted edits only by stable task ID', () => {
  const tasks = createTasks()
  const visible = [...filterPlanningTasks(tasks, { ...defaultPlanningFilters(), projectId: 'billing-platform' })]
    .sort((a, b) => b.name.localeCompare(a.name))
  const edited = visible[0]
  const next = applyPlanningGridEdit(tasks, { model: edited, prop: 'workflowStatus', val: 'blocked' })
  assert.equal(next.find(({ id }) => id === edited.id)?.workflowStatus, 'blocked')
  assert.equal(next.filter((task, index) => task !== tasks[index]).length, 1)
  assert.equal(applyPlanningGridEdit(tasks, { prop: 'name', val: 'Wrong task' }), tasks)
})

test('merges visible Kanban changes without removing hidden tasks', () => {
  const tasks = createTasks()
  const visible = filterPlanningTasks(tasks, { ...defaultPlanningFilters(), projectId: 'internal-tools' })
  const movedCard = { ...visible[0], workflowStatus: 'done' }
  const moved = visible.map(task => task.id === movedCard.id ? movedCard : task)
  const merged = mergeVisibleTasks(tasks, moved)
  assert.equal(merged.length, 100)
  assert.equal(merged.find(({ id }) => id === movedCard.id)?.workflowStatus, 'done')
  assert.deepEqual(merged.filter(({ projectId }) => projectId !== 'internal-tools'), tasks.filter(({ projectId }) => projectId !== 'internal-tools'))
})

test('synchronizes a grid status edit into the Kanban source', () => {
  const tasks = createTasks()
  const edited = applyPlanningGridEdit(tasks, { model: tasks[4], prop: 'workflowStatus', val: 'blocked' })
  assert.equal(edited.find(task => task.id === tasks[4].id)?.workflowStatus, 'blocked')
})

test('reconciles a filtered Kanban move into canonical tasks', () => {
  const tasks = createTasks()
  const visible = filterPlanningTasks(tasks, { ...defaultPlanningFilters(), projectId: 'billing-platform' })
  const card = { ...visible[0], workflowStatus: 'done' }
  const next = updateFromKanban(tasks, { changedCards: [card] } as Parameters<typeof updateFromKanban>[1])
  assert.equal(next.find(task => task.id === card.id)?.workflowStatus, 'done')
  assert.deepEqual(next.filter(task => task.projectId !== 'billing-platform'), tasks.filter(task => task.projectId !== 'billing-platform'))
})

test('reset fixtures and filters restore deterministic defaults', () => {
  const initial = createTasks()
  const edited = applyPlanningGridEdit(initial, { model: initial[0], prop: 'name', val: 'Changed' })
  assert.notDeepEqual(edited, initial)
  assert.deepEqual(createTasks(), initial)
  assert.deepEqual(defaultPlanningFilters(), { query: '', projectId: 'all', statuses: ['in-progress', 'blocked', 'not-started'], priorities: [] })
})

test('opens timeline views on the fixed fixture window', () => {
  assert.match(configSource, /zoomPreset:\s*'day-week'/)
  assert.match(configSource, /timelinePrecision:\s*'day'/)
  assert.match(configSource, /view:\s*'month'/)
  assert.match(configSource, /dateRange:\s*\{ start: '2026-09-01', end: '2026-09-30' \}/)
})

test('keeps all four Kanban columns compact enough for the workspace', () => {
  const columns = [...configSource.matchAll(/name:\s*'[^']+',\s*size:\s*(\d+),\s*minSize:\s*(\d+)/g)]
  assert.equal(columns.length, 4)
  assert.equal(columns.every(([, size, minSize]) => Number(size) >= Number(minSize) && Number(minSize) === 216), true)
  assert.equal(columns.reduce((total, [, size]) => total + Number(size), 0), 912)
})

test('renders Kanban resources with their native avatar data', () => {
  assert.match(configSource, /import \{ avatarTemplate \} from '@revolist\/revogrid-pro'/)
  assert.match(configSource, /planning-card__avatar-stack/)
  assert.match(configSource, /value: card\.ownerAvatars\[index\] \?\? owner/)
  assert.match(stylesSource, /planning-card__avatar-stack/)
})
