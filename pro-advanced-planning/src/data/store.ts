import type { PlanningTask } from './types'
import { deletePlanningTasks, reorderVisibleTasks } from './workspace'
import {
    updateFromPlanningEdit,
    type PlanningEditDetail,
} from './sync'

/**
 * Demo-owned canonical state. Published arrays are view snapshots: committed
 * producer edits update this store without replacing the active grid source.
 */
export class PlanningWorkspaceStore {
    private tasks: PlanningTask[]

    constructor(tasks: PlanningTask[]) {
        this.tasks = tasks
    }

    get size(): number {
        return this.tasks.length
    }

    createSnapshot(): PlanningTask[] {
        return [...this.tasks]
    }

    replace(tasks: PlanningTask[]): void {
        this.tasks = tasks
    }

    delete(taskIds: readonly string[]): void {
        this.tasks = deletePlanningTasks(this.tasks, taskIds)
    }

    commitVisibleOrder(visibleTasks: readonly PlanningTask[]): void {
        this.tasks = reorderVisibleTasks(this.tasks, visibleTasks)
    }

    commitPlanningEdit(detail: PlanningEditDetail): void {
        this.tasks = updateFromPlanningEdit(this.tasks, detail)
    }
}
