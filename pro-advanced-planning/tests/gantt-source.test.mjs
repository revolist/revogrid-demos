import assert from 'node:assert/strict'
import test from 'node:test'
import { toPlanningGanttSource } from '../src/data/gantt-source.ts'

const task = (number) => ({
    id: `task-${String(number).padStart(3, '0')}`,
    name: `Task ${number}`,
    type: 'task',
    owner: 'Maya',
    startDate: '2026-09-07T08:00:00Z',
    endDate: '2026-09-09T18:00:00Z',
})

test('projects all task identities into a three-level hierarchy without mutating canonical tasks', () => {
    const tasks = Array.from({ length: 100 }, (_, index) => Object.freeze(task(index + 1)))
    const rows = toPlanningGanttSource(tasks)
    const leaves = rows.filter(({ type }) => type !== 'summary')
    assert.deepEqual(leaves.map(({ id }) => id), tasks.map(({ id }) => id))
    assert.equal(rows.filter(({ type }) => type === 'summary').length, 6)
    const byId = new Map(rows.map((row) => [row.id, row]))
    for (const leaf of leaves) {
        const phase = byId.get(leaf.parentId)
        assert.equal(phase.type, 'summary')
        assert.equal(byId.get(phase.parentId).name, 'Launch program')
        assert.equal(byId.get(phase.parentId).parentId, null)
    }
    assert.ok(tasks.every((row) => !('parentId' in row)))
})

test('filtering keeps stable ancestors and omits empty phases', () => {
    const rows = toPlanningGanttSource([task(42)])
    assert.equal(rows.length, 3)
    assert.equal(rows[1].name, 'Integrations and automation')
    assert.equal(rows[2].parentId, rows[1].id)
    assert.deepEqual(toPlanningGanttSource([]), [])
})
