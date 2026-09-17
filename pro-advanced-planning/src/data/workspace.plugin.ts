import { getVisibleSourceItem } from '@revolist/revogrid'
import { CorePlugin, RowSelectPlugin } from '@revolist/revogrid-pro'
import type { PlanningTask } from './types'

/** Demo integration point for grid-owned planning state. */
export class PlanningWorkspacePlugin extends CorePlugin {
    getVisibleSource(): PlanningTask[] {
        return getVisibleSourceItem(
            this.providers.data.stores.rgRow.store
        ) as PlanningTask[]
    }

    clearRowSelection(): void {
        this.providers.plugins
            .getByClass(RowSelectPlugin)
            ?.clearSelection('rgRow')
    }
}

/** Resolve the planning integration plugin from the grid emitting an event. */
export async function getPlanningVisibleSource(
    event: Event
): Promise<PlanningTask[]> {
    const grid = event.currentTarget as HTMLRevoGridElement | null
    if (!grid) return []
    const plugin = (await grid.getPlugins()).find(
        (candidate): candidate is PlanningWorkspacePlugin =>
            candidate instanceof PlanningWorkspacePlugin
    )
    return plugin?.getVisibleSource() ?? []
}
