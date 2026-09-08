type RowSelectionRuntime = {
    setSelectedIndexes(
        type: 'rgRow',
        indexes: Iterable<number>
    ): void
}

function isRowSelectionRuntime(
    plugin: unknown
): plugin is RowSelectionRuntime {
    return (
        typeof plugin === 'object' &&
        plugin !== null &&
        'setSelectedIndexes' in plugin &&
        typeof plugin.setSelectedIndexes === 'function'
    )
}

/** Clear checkbox selection after the application removes source rows. */
export async function clearPlanningRowSelection(
    grid: HTMLRevoGridElement | undefined | null
) {
    if (!grid) return
    const rowSelection = (await grid.getPlugins()).find(
        isRowSelectionRuntime
    )
    rowSelection?.setSelectedIndexes('rgRow', [])
}
