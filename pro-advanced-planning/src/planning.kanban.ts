import { KanbanPlugin } from '@revolist/kanban'

type RevealableKanbanPlugin = KanbanPlugin & {
    revealCard(cardId: string | number): Promise<boolean>
}

/** Reveals the newly committed card after the board has mounted. */
export async function revealPlanningKanbanCard(
    grid: HTMLRevoGridElement | undefined,
    taskId: string | undefined
): Promise<boolean> {
    if (!grid || !taskId) return false
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const plugins = await grid.getPlugins()
    const kanban = plugins.find(
        (plugin) => plugin instanceof KanbanPlugin
    ) as RevealableKanbanPlugin | undefined
    return (await kanban?.revealCard(taskId)) ?? false
}
