import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createTasks, planningPeople } from '../src/data/fixtures'
import { applyPlanningGridEdit, defaultPlanningFilters, filterPlanningTasks, mergeVisibleTasks, selectedPlanningTaskIds } from '../src/data/workspace'
import { updateFromKanban } from '../src/data/sync'
const configSource = readFileSync(new URL('../src/data/config.ts', import.meta.url), 'utf8')

test('provides a stable 50-task fixture across three projects', () => {
  const tasks = createTasks()
  assert.equal(tasks.length, 50)
  assert.equal(new Set(tasks.map(({ id }) => id)).size, 50)
  assert.deepEqual([...new Set(tasks.map(({ projectId }) => projectId))].sort(), [
    'billing-platform', 'customer-portal', 'internal-tools',
  ])
  assert.ok(tasks.every(({ startDate }) => startDate.startsWith('2026-09-')))
  assert.ok(new Set(tasks.map(({ duration }) => duration)).size >= 5)
  assert.ok(new Set(tasks.map(({ startDate }) => startDate.slice(0, 10))).size < tasks.length)
  assert.ok(tasks.some((task, index) => index > 0 && task.startDate < tasks[index - 1].startDate))
  assert.ok(tasks.every(({ startDate, endDate }) => Date.parse(endDate) - Date.parse(startDate) >= 30 * 60 * 60 * 1000))
})

test('uses deterministic local avatars for every shared owner', () => {
  const tasks = createTasks()
  assert.equal(planningPeople.every(person => Boolean(person.color)), true)
  assert.equal(tasks.every(task => task.ownerAvatar.startsWith('data:image/svg+xml,')), true)
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
  assert.deepEqual(filterPlanningTasks(tasks, defaultPlanningFilters()), tasks)
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
  assert.equal(merged.length, 50)
  assert.equal(merged.find(({ id }) => id === movedCard.id)?.workflowStatus, 'done')
  assert.deepEqual(merged.filter(({ projectId }) => projectId !== 'internal-tools'), tasks.filter(({ projectId }) => projectId !== 'internal-tools'))
})

test('maps filtered row selection to stable task IDs', () => {
  const tasks = createTasks()
  const visible = filterPlanningTasks(tasks, { ...defaultPlanningFilters(), projectId: 'customer-portal' })
  assert.deepEqual(
    [...selectedPlanningTaskIds(visible, [new Set([0, 3])])],
    [visible[0].id, visible[3].id],
  )
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
  assert.deepEqual(defaultPlanningFilters(), { query: '', projectId: 'all', statuses: [], priorities: [] })
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
