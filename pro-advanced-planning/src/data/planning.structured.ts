import {
    BUILT_IN_STRUCTURED_FILTER_TYPES,
    FILTER_CALENDAR_RANGE,
    FILTER_CHIP_BADGE_TOGGLES,
    FILTER_HISTOGRAM_BRUSH,
    FILTER_TIME_MATRIX,
    createCalendarRangeStructuredFilterType,
    createChipBadgeStructuredFilterType,
    createHistogramBrushStructuredFilterType,
    createTimeMatrixStructuredFilterType,
} from '@revolist/revogrid-pro'
import { workflowBadges } from './palette'
export { workflowBadges } from './palette'

export {
    FILTER_CALENDAR_RANGE,
    FILTER_CHIP_BADGE_TOGGLES,
    FILTER_HISTOGRAM_BRUSH,
    FILTER_TIME_MATRIX,
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
