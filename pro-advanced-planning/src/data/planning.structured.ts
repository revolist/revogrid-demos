import {
    BUILT_IN_STRUCTURED_FILTER_TYPES,
    FILTER_CALENDAR_RANGE,
    FILTER_CHIP_BADGE_TOGGLES,
    FILTER_HISTOGRAM_BRUSH,
    FILTER_RATING_PROGRESS_THRESHOLD,
    FILTER_TIME_MATRIX,
    createCalendarRangeStructuredFilterType,
    createChipBadgeStructuredFilterType,
    createHistogramBrushStructuredFilterType,
    createRatingProgressThresholdStructuredFilterType,
    createTimeMatrixStructuredFilterType,
} from '@revolist/revogrid-pro'

export {
    FILTER_CALENDAR_RANGE,
    FILTER_CHIP_BADGE_TOGGLES,
    FILTER_HISTOGRAM_BRUSH,
    FILTER_RATING_PROGRESS_THRESHOLD,
    FILTER_TIME_MATRIX,
}

export const workflowBadges: Readonly<
    Record<string, { label: string; color: string }>
> = {
    'not-started': { label: 'Planned', color: '#475569' },
    'in-progress': { label: 'In progress', color: '#4338ca' },
    blocked: { label: 'Blocked', color: '#c62828' },
    done: { label: 'Done', color: '#087443' },
}

const configuredTypes = new Map([
    [
        FILTER_CHIP_BADGE_TOGGLES,
        createChipBadgeStructuredFilterType({
            order: ['not-started', 'in-progress', 'blocked', 'done'],
            badge: ({ value }) =>
                workflowBadges[String(value)] ?? {
                    label: String(value),
                    color: '#475569',
                },
        }),
    ],
    [
        FILTER_CALENDAR_RANGE,
        createCalendarRangeStructuredFilterType({
            locale: 'en-US',
            weekStartsOn: 1,
        }),
    ],
    [
        FILTER_RATING_PROGRESS_THRESHOLD,
        createRatingProgressThresholdStructuredFilterType({
            unit: 'percent',
            max: 100,
            step: 5,
        }),
    ],
    [
        FILTER_HISTOGRAM_BRUSH,
        createHistogramBrushStructuredFilterType({
            bins: 8,
            formatValue: (value) =>
                `$${Math.round(value).toLocaleString('en-US')}`,
            formatMatchCount: (count) =>
                `${count.toLocaleString('en-US')} tasks`,
        }),
    ],
    [
        FILTER_TIME_MATRIX,
        createTimeMatrixStructuredFilterType({
            locale: 'en-US',
            weekStartsOn: 1,
            useAmPm: true,
        }),
    ],
])

export const planningStructuredFilterTypes = Object.freeze(
    BUILT_IN_STRUCTURED_FILTER_TYPES.map(
        (type) => configuredTypes.get(type.id) ?? type
    )
)
