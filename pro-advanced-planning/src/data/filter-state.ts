import type { AdvancedFilterConfig, FilterAst } from '@revolist/revogrid-pro'
import { planningFilterConfig } from './columns'

export type PlanningFilterView = 'grid' | 'kanban' | 'gantt'

export type PlanningViewFilters = Record<
    PlanningFilterView,
    { filterAst?: FilterAst }
>

export function createPlanningViewFilters(): PlanningViewFilters {
    return { grid: {}, kanban: {}, gantt: {} }
}

/** Keeps the plugin's transient rehydration state out of the saved AST. */
export function planningFilterConfigFor(
    filters: PlanningViewFilters,
    view: PlanningFilterView
): AdvancedFilterConfig {
    return Object.defineProperty(
        {
            ...planningFilterConfig,
            multiFilterItems: { ...planningFilterConfig.multiFilterItems },
        },
        'filterAst',
        {
            enumerable: true,
            get: () => filters[view].filterAst,
        }
    ) as AdvancedFilterConfig
}
