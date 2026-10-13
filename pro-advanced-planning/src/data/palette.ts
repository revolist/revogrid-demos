/** Matches the default Pivot charts palette without depending on Pivot internals. */
export const planningPalette = {
    purple: '#6647f0',
    orange: '#fc6d2d',
    blue: '#0091ff',
    pink: '#ff02f0',
    teal: '#00b8a6',
} as const

/** Shared by task fixtures, status edits, grid badges and filter choices. */
export const workflowBadges: Readonly<
    Record<string, { label: string; color: string; textColor: string }>
> = {
    'not-started': { label: 'Planned', color: planningPalette.blue, textColor: '#171717' },
    'in-progress': { label: 'In progress', color: planningPalette.purple, textColor: '#ffffff' },
    blocked: { label: 'Blocked', color: planningPalette.orange, textColor: '#171717' },
    done: { label: 'Done', color: planningPalette.teal, textColor: '#171717' },
}
