import type { PlanningTask } from './types'

type PlanningGanttRow = Omit<PlanningTask, 'type'> & {
    type: PlanningTask['type'] | 'summary'
}

const phases = [
    'Discovery and foundations',
    'Core product delivery',
    'Integrations and automation',
    'Quality and readiness',
    'Launch and continuous improvement',
]

/** Add native Gantt summaries without adding records to the shared task store. */
export function toPlanningGanttSource(tasks: readonly PlanningTask[]): PlanningGanttRow[] {
    if (!tasks.length) return []

    const summary = (id: string, name: string, parentId: string | null): PlanningGanttRow => ({
        ...tasks[0],
        id,
        name,
        parentId,
        type: 'summary',
        owner: '',
        ownerAvatar: '',
        ownerAvatarIndex: 0,
        duration: 0,
        percentDone: 0,
    })
    const rootId = 'planning-launch-program'
    const rows: PlanningGanttRow[] = [summary(rootId, 'Launch program', null)]

    phases.forEach((name, phaseIndex) => {
        const children = tasks.filter((task) => {
            const taskNumber = Number(task.id.replace('task-', ''))
            return Math.min(phases.length - 1, Math.floor((taskNumber - 1) / 20)) === phaseIndex
        })
        if (!children.length) return
        const phaseId = `planning-phase-${phaseIndex + 1}`
        rows.push(summary(phaseId, name, rootId))
        rows.push(...children.map((task) => ({ ...task, parentId: phaseId })))
    })

    return rows
}
