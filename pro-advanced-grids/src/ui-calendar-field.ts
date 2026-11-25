import { createCalendarField } from '@revolist/ui/native';
import '@revolist/ui/styles/calendar.css';
import '@revolist/ui/calendar/date-field.css';
import './ui-calendar-field.css';

/** Apply the workbench's labels and icon styling to the shared native control. */
export function calendarField(label: string, value = '') {
  return createCalendarField(document, {
    label,
    openLabel: `Choose ${label}`,
    value,
    triggerClassName: 'ui-calendar-field__trigger workbench-icon',
    triggerIcon: 'calendar-add',
    popupClassName: 'ui-calendar-field__popup',
  });
}
