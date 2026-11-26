import { createControl, createButtonElement, createCheckboxElement, createProgressElement, mountTabs } from '@revolist/ui/native';
import { ROW_ACTION_COLUMN_WIDTH } from '../../../../composables/row-action';
import { calendarField } from '../../shared/ui-calendar-field';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Badge, CalendarNavigator, CalendarPicker, Checkbox, Menu, MenuItem, MultiSelect, RadioGroup } from '@revolist/ui/react';
import { renderDateSlotHeader } from '@revolist/revogrid-pro';
import { diffInCalendarDays, type ISODateString } from '@revolist/ui/dates';
import '@revolist/ui/styles/calendar.scss';
import type { ColumnData, ColumnRegular } from '@revolist/revogrid';
import {
  button,
  field,
  fixedDate,
  input,
  make,
  matches,
  select,
  personSelect,
  selectOptions,
  type Example,
} from '../../shared/workbench-ui';

import { GridPopoverPlugin, createTimeRangeSlotHeaderFormatter, statusActionRenderer, progressDetailRenderer, identityCellRenderer, cellActionRenderer, visualCellRenderer } from '@revolist/revogrid-pro';
import { KeyedRowSelectionPlugin } from '@revolist/revogrid-pro';
import { initialKitchens, initialVisits, technicians, areaManagers } from './visit-fixtures';
import { services, serviceStates, kitchenPlan, coverage, dueVisits, effectiveStatus, suggestCrew, bookingError, planDueBookings, kitchenError, visitWindows, type VisitWindow, type Kitchen, type Visit, type Service, type Status } from './visit-model';

const serviceKeys: Service[] = ['clean', 'pest', 'grease', 'hood', 'fridge', 'fire'];
const serviceLabels = serviceKeys.map(key => services[key].label);
const statuses: Status[] = ['Due', 'Booked', 'Awaiting', 'Completed', 'Missed'];
const start = fixedDate(0).valueOf();
const dayMs = 86_400_000;
const iso = (day: number) => fixedDate(day).toISOString().slice(0, 10) as ISODateString;
const weekday = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  timeZone: 'UTC',
});
const dateLabel = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export const visitPlanner: Example = {
  id: 'service-visits',
  title: 'Field Service Visit Planner',
  description:
    'Contractor coverage across a rolling three-week kitchen schedule',
  setup(bench) {
    let firstDay = 0;
    let nextId = initialKitchens.length;
    const kitchens: Kitchen[] = structuredClone(initialKitchens);
    const visits: Visit[] = structuredClone(initialVisits);
    const activities: { kitchen: number; title: string; detail: string }[] = [];
    const logActivities = (items: { kitchen: number; title: string; detail: string }[]) => {
      activities.unshift(...items.slice().reverse());
      return () => { for (const item of items) { const index = activities.indexOf(item); if (index >= 0) activities.splice(index, 1); } };
    };
    const activityDate = (day: number) => `${weekday.format(fixedDate(day))}, ${dateLabel.format(fixedDate(day))}`;
    let selectedKitchenIds: number[] = [];
    let selectionPlugin: KeyedRowSelectionPlugin | undefined;
    const selectionReady = customElements.whenDefined('revo-grid').then(() => bench.grid.componentOnReady()).then(() => bench.grid.getPlugins()).then(plugins => selectionPlugin = plugins.find((plugin): plugin is KeyedRowSelectionPlugin => plugin instanceof KeyedRowSelectionPlugin));
    const clearSelected = () => {
      selectedKitchenIds = [];
      renderSelection();
      if (selectionPlugin) selectionPlugin.clear();
      else void selectionReady.then(plugin => plugin?.clear());
    };
    const service = select(
      'Service',
      ['All Services', ...serviceLabels],
      'All Services',
      () => { clearSelected(); bench.resetPage(); refresh(); },
    );
    const selectedStatuses = new Set<Status>();
    const statusGroup = make('div', '', 'visit-status-controls');
    const statusMenu = make('div', '', 'visit-status-select');
    statusGroup.append(statusMenu);
    const statusRoot = createRoot(statusMenu);
    const statusOptions = [
      { value: 'Missed', label: 'Missed' },
      { value: 'Awaiting', label: 'Awaiting' },
      { value: 'Booked', label: 'Confirmed' },
      { value: 'Completed', label: 'Done' },
    ] as const;
    const renderStatus = (allRows: ReturnType<typeof kitchenRows>) => {
      const source = statusOptions.map(option => ({
        ...option,
        count: allRows.flatMap(row => row.visits).filter(visit => visit.status === option.value).length,
      }));
      statusRoot.render(createElement(MultiSelect, {
        source,
        value: [...selectedStatuses],
        placeholder: 'Status',
        config: { ariaLabel: 'Status', multiSelect: true, selectedDisplay: 'count', topLayer: true, nativeTabNavigation: true },
        onChange: (value: unknown) => {
          selectedStatuses.clear();
          for (const status of Array.isArray(value) ? value : [value]) if (typeof status === 'string' && statuses.includes(status as Status)) selectedStatuses.add(status as Status);
          clearSelected(); bench.resetPage(); refresh();
        },
        renderOption: (option: any, selected: boolean) => createElement('div', { className: 'option-content visit-status-multiselect-option' },
          createElement(Checkbox, { checked: selected, readOnly: true, tabIndex: -1, 'aria-hidden': true }),
          createElement('span', null, option.label), createElement(Badge, { className: 'visit-status-count', variant: 'neutral', shape: 'pill' }, String(option.count))),
      }));
    };
    bench.onDispose(() => statusRoot.unmount());
    const navigator = make('div', '', 'visit-navigation');
    const navigatorRoot = createRoot(navigator);
    const renderNavigator = () => navigatorRoot.render(createElement(CalendarNavigator, {
      value: iso(firstDay), today: iso(0), stepDays: 7, className: 'workbench-segments',
      labels: { previous: 'Previous week', next: 'Next week', today: 'Today', calendar: 'Start date', dialog: 'Choose start date', title: (value: ISODateString) => `Start date: ${value}` },
      calendar: { referenceDate: iso(firstDay), weekStartsOn: 0, showOutsideDays: true, fixedWeeks: false, enableYearView: false, formatWeekday: (value: ISODateString) => weekday.format(new Date(`${value}T00:00:00Z`)).slice(0, 2), popup: { className: 'visit-navigator-popup' } },
      onChange: (value: ISODateString) => shift(diffInCalendarDays(iso(0), value)),
    }));
    bench.onDispose(() => navigatorRoot.unmount());
    const addKitchen = button('Add Kitchen', () => editKitchen());
    addKitchen.dataset.icon = 'store';
    bench.heading.append(
      navigator,
      addKitchen,
      button('Book Visit', () => bookVisit(), true),
    );
    const bookDue = (due: Visit[]) => {
      if (!due.length) return;
      const { bookings: added, skipped } = planDueBookings(due, kitchens, visits, technicians);
      const skippedMessage = skipped.length ? ` ${skipped.length} ${skipped.length === 1 ? 'visit was' : 'visits were'} skipped; check availability and existing visits.` : '';
      if (!added.length) {
        bench.report(`Visits could not be booked.${skippedMessage}`);
        return;
      }
      visits.push(...added);
      const undoActivity = logActivities(added.map(visit => ({ kitchen: visit.kitchen, title: `${services[visit.service].label} booked`, detail: activityDate(visit.day) })));
      refresh();
      bench.report(`${added.length} ${added.length === 1 ? 'visit' : 'visits'} booked. Each one awaits its vendor's confirmation.${skippedMessage}`, () => {
        for (const booking of added) { const index = visits.indexOf(booking); if (index >= 0) visits.splice(index, 1); }
        undoActivity(); refresh();
      });
    };
    const bookAll = button('Book due visits', () => bookDue(kitchenRows().flatMap(row => row.visits.filter(visit => visit.status === 'Due'))));
    const selectionPanel = make('div', '', 'visit-selection');
    selectionPanel.setAttribute('role', 'region'); selectionPanel.setAttribute('aria-label', 'Selected kitchens'); selectionPanel.hidden = true;
    const selectionSummary = make('div', '', 'visit-selection__summary');
    const confirmSelected = button('Confirm All', () => {
      const selected = kitchenRows().filter(row => selectedKitchenIds.includes(row.id));
      const pending = selected.flatMap(row => row.visits.filter(visit => visit.status === 'Awaiting').map(visit => (visit as Visit & { original?: Visit }).original ?? visit));
      for (const visit of pending) visit.status = 'Booked';
      if (!pending.length) return;
      const undoActivity = logActivities(pending.map(visit => ({ kitchen: visit.kitchen, title: `${services[visit.service].label} confirmed`, detail: activityDate(visit.day) })));
      refresh(); bench.report(`${pending.length} ${pending.length === 1 ? 'visit' : 'visits'} confirmed.`, () => { for (const visit of pending) visit.status = 'Awaiting'; undoActivity(); refresh(); });
    });
    confirmSelected.dataset.icon = 'calendar-add';
    const bookSelected = button('Book All', () => bookDue(kitchenRows().filter(row => selectedKitchenIds.includes(row.id)).flatMap(row => row.visits.filter(visit => visit.status === 'Due'))));
    bookSelected.dataset.icon = 'calendar-add';
    const removeSelected = button('Remove', () => {
      const ids = new Set(selectedKitchenIds);
      const removedKitchens = kitchens.flatMap((kitchen, index) => ids.has(kitchen.id) ? [{ kitchen, index }] : []);
      const removedVisits = visits.flatMap((visit, index) => ids.has(visit.kitchen) ? [{ visit, index }] : []);
      bench.form('Remove kitchens?', [make('p', `${removedKitchens.length} ${removedKitchens.length === 1 ? 'kitchen' : 'kitchens'} and ${removedVisits.length} visits will leave the plan.`)], () => {
        for (const item of removedKitchens.slice().reverse()) kitchens.splice(item.index, 1);
        for (const item of removedVisits.slice().reverse()) visits.splice(item.index, 1);
        clearSelected(); refresh();
        bench.report(`${removedKitchens.length} ${removedKitchens.length === 1 ? 'kitchen' : 'kitchens'} removed.`, () => {
          for (const item of removedKitchens) kitchens.splice(Math.min(item.index, kitchens.length), 0, item.kitchen);
          for (const item of removedVisits) visits.splice(Math.min(item.index, visits.length), 0, item.visit);
          refresh();
        });
      }, undefined, 'Remove Kitchens');
    });
    removeSelected.classList.add('visit-selection__remove'); removeSelected.dataset.icon = 'trash';
    const clearSelection = button('Clear', clearSelected);
    const selectionActions = make('div', '', 'visit-selection__actions'); selectionActions.append(confirmSelected, bookSelected, removeSelected, clearSelection);
    selectionPanel.append(selectionSummary, selectionActions);
    bench.grid.addEventListener('keyedrowselectionchange', event => {
      selectedKitchenIds = event.detail.keys.filter((key): key is number => typeof key === 'number');
      renderSelection();
    });
    function renderSelection() {
      const active = selectedKitchenIds.length > 0;
      selectionPanel.hidden = !active;
      for (const child of Array.from(bench.toolbar.children)) if (child !== selectionPanel) (child as HTMLElement).hidden = active;
      if (!active) return;
      const rows = kitchenRows().filter(row => selectedKitchenIds.includes(row.id));
      const windowVisits = rows.flatMap(row => row.visits);
      const awaiting = windowVisits.filter(visit => visit.status === 'Awaiting').length;
      const due = windowVisits.filter(visit => visit.status === 'Due').length;
      selectionSummary.replaceChildren(make('strong', `${selectedKitchenIds.length} ${selectedKitchenIds.length === 1 ? 'kitchen' : 'kitchens'} selected`), make('span', `  •  ${awaiting} awaiting  •  ${due} unbooked`));
      confirmSelected.disabled = awaiting === 0; bookSelected.disabled = due === 0;
    }
    bookAll.dataset.icon = 'calendar-add';
    bench.toolbar.append(
      service,
      statusGroup,
      bookAll,
      selectionPanel,
    );
    bench.onSearch(() => { clearSelected(); bench.resetPage(); refresh(); });
    let columns = makeColumns();
    const syncCompact = () => {
      service.setOptionLabel(0, window.matchMedia('(max-width: 650px)').matches ? 'All' : 'All Services');
      columns = makeColumns();
      refresh();
    };
    bench.onCompactChange(syncCompact);
    syncCompact();

    function shift(day: number) {
      clearSelected();
      firstDay = day;
      columns = makeColumns();
      refresh();
    }

    function kitchenRows(applyStatus = true) {
      const query = bench.currentQuery();
      const selected = serviceKeys.find(key => services[key].label === service.value);
      return kitchens.flatMap(kitchen => {
        if (selected && !kitchen.services.includes(selected)) return [];
        const allStates = serviceStates(kitchen, visits);
        const states = selected ? allStates.filter(state => state.service === selected) : allStates;
        const schedule = [...visits.filter(visit => visit.kitchen === kitchen.id), ...dueVisits(kitchen, visits, allStates)]
          .filter(visit => visit.day >= firstDay && visit.day < firstDay + 21)
          .filter(visit => !selected || visit.service === selected)
          .map(visit => visit.status === 'Due' ? visit : { ...visit, status: effectiveStatus(visit), original: visit });
        if (!(!query || matches(query, kitchen.label, kitchen.manager, ...schedule.map(visit => visit.crew)))) return [];
        if (applyStatus && selectedStatuses.size && !schedule.some(visit => selectedStatuses.has(visit.status))) return [];
        const visible = schedule;
        return [{ ...kitchen, kitchen, subtitle: kitchen.manager, visits: visible, coverage: coverage(states) }];
      }).sort((a, b) => a.coverage.rank - b.coverage.rank || a.label.localeCompare(b.label));
    }

    function refresh() {
      renderNavigator();
      const allRows = kitchenRows(false);
      renderStatus(allRows);
      const rows = selectedStatuses.size ? allRows.filter(row => row.visits.some(visit => selectedStatuses.has(visit.status))) : allRows;
      const visible = rows.flatMap(row => row.visits);
      const due = visible.filter(visit => visit.status === 'Due').length;
      bookAll.disabled = !due;
      bookAll.textContent = 'Book All';
      bookAll.setAttribute('aria-label', due ? `Book all ${due} unbooked visits` : 'Book all due visits');
      bench.setSubtitle(`${dateLabel.format(fixedDate(firstDay))} to ${dateLabel.format(fixedDate(firstDay + 20))} • ${rows.length} kitchens`);
      bench.stats([
        ['Schedule window', `${dateLabel.format(fixedDate(firstDay))}–${dateLabel.format(fixedDate(firstDay + 20))}`],
        ['Kitchens', String(rows.length)],
        ['Booked', String(visible.filter(visit => visit.status === 'Booked').length)],
        ['Needs attention', String(due + visible.filter(visit => visit.status === 'Missed').length)],
      ]);
      bench.render(columns, rows);
      renderSelection();
    }

    function makeColumns(): ColumnData {
      const formatDateHeader = createTimeRangeSlotHeaderFormatter('en');
      const paths: Record<Status, string[]> = {
        Due: ['M12 5v14M5 12h14'],
        Booked: ['M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M8 2v4M16 2v4M3 9h18M8 15l2 2 5-5'],
        Completed: ['M5 12l4 4L19 6'],
        Awaiting: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 7v5l3 2'],
        Missed: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 8v5M12 16h.01'],
      };
      const itemsFor = (model: any, day: number) => (model.visits as Visit[]).filter(visit => visit.day === day);
      const days: ColumnRegular = {
        prop: 'day', size: window.matchMedia('(max-width: 650px)').matches ? 33 : 39,
        dateRangeColumns: {
          start: iso(firstDay), end: iso(firstDay + 20), unit: 'day', locale: 'en',
          prop: slot => `day-${firstDay + slot.index}`,
        },
        columnTemplate: (h, column) => {
          const slot = column.dateSlot!, parts = formatDateHeader(slot);
          return renderDateSlotHeader(h, { day: parts.day, weekday: parts.weekday.slice(0, 2), label: slot.label, className: 'visit-day' });
        },
        cellTemplate: statusActionRenderer,
        statusAction: {
          format: (_value, model, column) => {
            const slot = column.dateSlot!, day = firstDay + slot.index, items = itemsFor(model, day);
            if (!items.length) return day >= 4 ? { label: `Book a visit at ${model.label} on ${slot.label}`, text: '+', className: 'visit-cell visit-cell--empty', actionClassName: 'cell-action' } : undefined;
            const first = items[0];
            const titles = items.map(item => `${services[item.service].label} · ${item.status}`).join(', ');
            return { label: `${model.label} · ${slot.label} · ${titles}`, className: `visit-cell visit-cell--${first.status.toLowerCase()}`, actionClassName: 'cell-action', hasPopup: 'dialog', ...(items.length > 1 ? { text: String(items.length) } : { iconPaths: paths[first.status] }) };
          },
          onActivate: (model, event, column) => {
            const day = firstDay + column.dateSlot!.index, items = itemsFor(model, day), first = items[0];
            const anchor = event.currentTarget as HTMLElement;
            if (!first) bookVisit({ kitchen: model.kitchen as Kitchen, day });
            else if (items.length === 1) first.status === 'Due' ? bookVisit({ kitchen: model.kitchen as Kitchen, day, service: first.service }) : showVisit((first as Visit & { original?: Visit }).original ?? first, anchor);
            else bench.form('Visits on this day', items.map(item => button(`${services[item.service].label} · ${item.status}`, () => showVisit((item as Visit & { original?: Visit }).original ?? item, anchor))), () => {});
          },
        },
      };
      return [
        { prop: 'label', name: 'Kitchen', pin: 'colPinStart', size: window.matchMedia('(max-width: 650px)').matches ? 152 : 165, sortable: true, cellTemplate: identityCellRenderer, identityCell: { format: (_value, model) => ({ label: String(model.label), detail: String(model.subtitle), className: 'cell-label', actionClassName: 'cell-action', actionLabel: `Open ${model.label}` }), onActivate: model => showKitchen(model.kitchen as Kitchen) } },
        days,
        {
          prop: 'coverage',
          name: 'Coverage',
          sortable: true,
          order: 'asc',
          size: 136,
          cellTemplate: progressDetailRenderer,
          progressDetail: { format: (_value, model) => {
            const result = model.coverage as ReturnType<typeof coverage>;
            const important = result.important;
            const note = !important || !result.priority ? 'On track' : `${services[important.service].short} ${result.priority === 4 ? 'missed' : result.priority === 3 ? 'lapsed' : result.priority === 2 ? `due ${dateLabel.format(fixedDate(important.due))}` : 'booked late'}`;
            return { value: result.onTrack, max: result.total, label: `Coverage ${result.onTrack} of ${result.total}`, valueText: `${result.onTrack}/${result.total}`, detail: note, className: `coverage-cell ${result.priority >= 3 ? 'bad' : result.priority ? 'warn' : 'good'}` };
          } },
        },
        { prop: 'actions', columnChooser: false, name: '', size: ROW_ACTION_COLUMN_WIDTH, cellTemplate: cellActionRenderer, cellAction: { label: model => `Actions for ${model.label}`, onActivate: model => editKitchen(model.kitchen as Kitchen) } },
      ];
    }

    function showKitchen(kitchen: Kitchen) {
      kitchen = kitchens.find(item => item.id === kitchen.id) ?? kitchen;
      const body = make('div', '', 'visit-book-editor visit-kitchen-view');
      const description = make('div', '', 'visit-kitchen-view__description');
      description.append(make('span', kitchen.address ?? ''), make('span', `${kitchen.manager}  •  ${kitchen.volume === 'high' ? 'High volume' : 'Moderate volume'}`));
      const tabs = make('div');
      const panel = make('div', '', 'visit-kitchen-content'); panel.setAttribute('role', 'tabpanel');
      panel.id = `kitchen-tab-panel-${kitchen.id}`;
      const history = () => visits.filter(visit => visit.kitchen === kitchen.id && visit.status === 'Completed').sort((a,b) => b.day - a.day);
      const options = () => [{ value: 'plan' as const, label: 'Plan', id: `kitchen-plan-tab-${kitchen.id}`, ariaControls: panel.id, count: kitchenPlan(kitchen, visits).length }, { value: 'history' as const, label: 'History', id: `kitchen-history-tab-${kitchen.id}`, ariaControls: panel.id, count: history().length + activities.filter(item => item.kitchen === kitchen.id).length }];
      const tabProps = (value: 'plan' | 'history') => ({ value, options: options(), onChange: showTab, ariaLabel: 'Kitchen details', className: 'visit-kitchen-tabs rv-tabs--underline', countClassName: 'visit-kitchen-tabs__count' });
      const tabControl = mountTabs(tabs, tabProps('plan'));
      body.append(description, tabs, panel);
      function showTab(tab: 'plan' | 'history') {
        const plan = kitchenPlan(kitchen, visits), done = history(), changes = activities.filter(item => item.kitchen === kitchen.id);
        tabControl.update(tabProps(tab));
        panel.setAttribute('aria-labelledby', `kitchen-${tab}-tab-${kitchen.id}`);
        panel.replaceChildren();
        if (tab === 'plan') {
          const result = coverage(plan), relevant = result.important;
          const note = !relevant || !result.priority ? 'On track' : `${services[relevant.service].short} ${result.priority === 4 ? 'missed' : result.priority === 3 ? 'lapsed' : result.priority === 2 ? `due ${dateLabel.format(fixedDate(relevant.due))}` : 'booked late'}`;
          const card = make('section', '', 'visit-kitchen-plan');
          const head = make('div', '', 'visit-kitchen-plan__heading');
          const caption = make('div'); caption.append(make('strong', 'Service Cycles'), make('small', note));
          const meter = make('div', '', `visit-kitchen-plan__meter ${result.priority >= 3 ? 'bad' : result.priority ? 'warn' : 'good'}`);
          const progress = createProgressElement(document, { label: `Coverage ${result.onTrack} of ${result.total}`, value: result.onTrack, max: result.total }); meter.append(progress, make('small', `${result.onTrack}/${result.total}`)); head.append(caption, meter); card.append(head);
          const grid = make('revo-grid', '', 'visit-kitchen-plan-grid');
          const compact = window.matchMedia('(max-width: 650px)').matches;
          grid.readonly = true; grid.theme = bench.grid.theme; grid.rowSize = 55; grid.hideAttribution = true; grid.style.setProperty('--revo-grid-header-height', '40px'); grid.style.height = `${40 + plan.length * 55 + 2}px`;
          const columns: ColumnData = [
            { prop: 'service', name: 'Service', size: compact ? 138 : 162, cellTemplate: identityCellRenderer, identityCell: { format: (_value, model) => { const key = model.service as Service; return { label: services[key].label, detail: `Every ${services[key][kitchen.volume]} days`, labelElement: 'span', className: 'visit-plan-service' }; } } },
            ...(!compact ? [{ prop: 'lastDone', name: 'Last Done', size: 104, cellTemplate: visualCellRenderer, visualCell: { format: (_value: unknown, model: any) => ({ kind: 'text' as const, text: model.lastDone == null ? 'Never' : dateLabel.format(fixedDate(Number(model.lastDone))) }) } }] : []),
            { prop: 'due', name: 'Due', size: compact ? 70 : 80, cellTemplate: visualCellRenderer, visualCell: { format: (_value, model) => ({ kind: 'text', className: Number(model.priority) >= 3 ? 'visit-plan-due bad' : Number(model.priority) ? 'visit-plan-due warn' : '', text: dateLabel.format(fixedDate(Number(model.due))) }) } },
            { prop: 'next', name: 'Next', size: compact ? 105 : 173, cellTemplate: statusActionRenderer, statusAction: {
              format: (_value, model) => {
                const state = model as unknown as ReturnType<typeof kitchenPlan>[number];
                if (state.next) {
                  const visit = state.next, status = effectiveStatus(visit), text = status === 'Booked' ? 'Confirmed' : status === 'Completed' ? 'Done' : status;
                  return { className: 'visit-plan-status', actionClassName: `visit-plan-next visit-plan-next--${status.toLowerCase()}`, label: `${services[state.service].label}, ${text}, ${dateLabel.format(fixedDate(visit.day))}`, text, detail: dateLabel.format(fixedDate(visit.day)) };
                }
                if (state.state === 'gap') return { className: 'visit-plan-status', actionClassName: 'visit-plan-book', label: `Book ${services[state.service].label}`, text: 'Book' };
                return { label: 'Not due yet', text: 'Not due yet', asText: true, className: 'visit-plan-empty' };
              },
              onActivate: (model, event) => {
                const state = model as unknown as ReturnType<typeof kitchenPlan>[number];
                if (state.next) showVisit(state.next, event.currentTarget as HTMLElement);
                else { const due = dueVisits(kitchen, visits, plan).find(item => item.service === state.service); bookVisit({ kitchen, day: due?.day, service: state.service }, undefined, kitchen); }
              },
            } },
          ];
          grid.columns = columns; grid.source = plan; card.append(grid); panel.append(card);
        } else {
          const section = make('section', '', 'visit-kitchen-history');
          const head = make('div', '', 'visit-kitchen-history__heading');
          const title = make('div'); title.append(make('strong', 'History'), make('small', 'Signed-off visits and today’s changes'));
          const exportButton = button('Export CSV', () => {
            const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
            const lines = [['Date', 'Service', 'Technician', 'Report', 'Notes'], ...changes.map(item => [iso(4), item.title, '', '', item.detail]), ...done.map(visit => [iso(visit.day), services[visit.service].label, visit.crew, visit.report, visit.notes ?? ''])];
            const url = URL.createObjectURL(new Blob([lines.map(line => line.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
            const link = make('a'); link.href = url; link.download = `${kitchen.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-history.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
          });
          head.append(title, exportButton); section.append(head);
          const list = make('div', '', 'visit-kitchen-history__list');
          for (const item of changes) {
            const row = make('div', '', 'visit-kitchen-history__row');
            const icon = make('span', '•', 'visit-kitchen-history__avatar'); icon.setAttribute('aria-hidden', 'true');
            const copy = make('div', '', 'visit-kitchen-history__copy'); copy.append(make('strong', item.title), make('small', item.detail));
            row.append(icon, copy, make('time', 'Today')); list.append(row);
          }
          for (const visit of done) {
            const row = make('div', '', 'visit-kitchen-history__row');
            const avatar = make('span', visit.crew.split(' ').map(part => part[0]).join('').slice(0, 2), 'visit-kitchen-history__avatar'); avatar.setAttribute('aria-hidden', 'true');
            const copy = make('div', '', 'visit-kitchen-history__copy'); copy.append(make('strong', `${services[visit.service].label} done`));
            if (visit.notes) copy.append(make('small', visit.notes));
            copy.append(make('small', `${visit.crew}${visit.report ? `  •  Report ${visit.report}` : ''}`));
            row.append(avatar, copy, make('time', dateLabel.format(fixedDate(visit.day)))); list.append(row);
          }
          if (!done.length && !changes.length) list.append(make('p', 'No signed-off visits yet.'));
          section.append(list); panel.append(section);
        }
      }

      showTab('plan');
      const edit = button('Edit', () => editKitchen(kitchen, true)); edit.dataset.icon = 'edit';
      const menuHost = make('div', '', 'visit-popover__menu-items'); const menuRoot = createRoot(menuHost);
      const menu = make('details', '', 'visit-kitchen-view__menu'); const trigger = createControl(document, 'summary'); trigger.textContent = '⋯'; trigger.setAttribute('aria-label', 'More actions'); trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-haspopup', 'menu');
      menuRoot.render(createElement(Menu, { label: 'Kitchen actions', onClose: () => { menu.open = false; trigger.focus(); } },
        createElement(MenuItem, { onClick: () => { menu.open = false; editKitchen(kitchen, true); } }, 'Edit Kitchen'),
        createElement(MenuItem, { onClick: () => { menu.open = false; removeKitchen(kitchen); } }, 'Remove Kitchen')));
      menu.append(trigger, menuHost);
      bench.form(kitchen.label, [body], () => { bookVisit({ kitchen }, undefined, kitchen); return false; }, edit, 'Book Visit', () => { tabControl.destroy(); menuRoot.unmount(); }, {
        cancel: false,
        submit: { icon: 'calendar-add' },
        close: { label: 'Close', className: 'visit-book-close' },
        content: [menu],
      });
    }

    function editKitchen(kitchen?: Kitchen, fromView = false) {
      if (kitchen) kitchen = kitchens.find(item => item.id === kitchen!.id) ?? kitchen;
      const name = input('Kitchen name', kitchen?.label); name.placeholder = 'Neighborhood and concept'; name.maxLength = 50; name.required = true;
      const address = input('Address', kitchen?.address); address.placeholder = 'Street and city'; address.maxLength = 80; address.required = true;
      const manager = personSelect('Area Manager', ['', ...areaManagers], kitchen?.manager ?? '');
      manager.setOptionLabel(0, 'Pick a manager'); manager.required = true;
      let selectedVolume: Kitchen['volume'] = kitchen?.volume ?? 'high';
      const volume = make('div');
      const volumeRoot = createRoot(volume);
      const renderVolume = () => volumeRoot.render(createElement(RadioGroup, {
        label: 'Cooking Volume', name: 'kitchen-volume', className: 'visit-book-status visit-kitchen-volume',
        value: selectedVolume, options: [{ value: 'high', label: 'High volume' }, { value: 'moderate', label: 'Moderate volume' }],
        onChange: (value: string | number) => { if (value === 'high' || value === 'moderate') { selectedVolume = value; renderVolume(); syncCycles(); } },
      }));
      renderVolume();
      const volumeHelp = make('small', 'Sets the hood cycle: every 90 days at high volume, 180 at moderate', 'visit-book-help');
      const section = make('fieldset', '', 'visit-kitchen-services'); section.append(make('legend', 'Services'));
      section.append(make('small', kitchen ? 'Unchecking a service cancels its open visits' : 'Set when each was last done; without a date it is due today', 'visit-book-help'));
      const selections = new Map<Service, { checkbox: HTMLInputElement; date: ReturnType<typeof calendarField>; cycle: HTMLElement }>();
      for (const key of serviceKeys) {
        const line = make('div', '', 'visit-kitchen-service');
        const checkbox = createCheckboxElement(document, { checked: kitchen ? kitchen.services.includes(key) : true, 'aria-label': services[key].label });
        const serviceLabel = make('label', '', 'visit-kitchen-service-label'); serviceLabel.append(make('span', services[key].label));
        const cycle = make('small', '', 'visit-book-help'); serviceLabel.append(cycle); serviceLabel.prepend(checkbox);
        const date = calendarField(`${services[key].label} last done`, kitchen?.priorDone[key] == null ? '' : iso(kitchen.priorDone[key])); date.max = iso(4); date.disabled = !checkbox.checked;
        const dateControl = make('div', '', 'visit-kitchen-date');
        checkbox.onchange = () => { date.disabled = !checkbox.checked; dateControl.classList.toggle('disabled', !checkbox.checked); };
        dateControl.append(date);
        selections.set(key, { checkbox, date, cycle });
        line.append(serviceLabel); if (!kitchen) line.append(dateControl); section.append(line);
      }
      const syncCycles = () => {
        const selected = selectedVolume;
        for (const [key, item] of selections) item.cycle.textContent = `Every ${services[key][selected]} days`;
      };
      syncCycles();
      const error = make('p', '', 'visit-book-error'); error.setAttribute('role', 'alert'); error.hidden = true;
      const body = make('div', '', 'visit-book-editor visit-kitchen-editor');
      body.append(make('p', kitchen ? kitchen.label : 'Joins the plan on the last-done dates you set.', 'visit-book-description'), field('Name', name), field('Address', address), field('Area Manager', manager), volume, volumeHelp, section, error);
      const remove = kitchen && button('Delete kitchen', () => removeKitchen(kitchen));
      bench.form(kitchen ? 'Edit Kitchen' : 'Add Kitchen', [body], () => {
        const selected = serviceKeys.filter(key => selections.get(key)!.checkbox.checked);
        const priorDone = kitchen ? { ...kitchen.priorDone } : Object.fromEntries(selected.flatMap(key => {
          const value = selections.get(key)!.date.valueAsNumber;
          return Number.isFinite(value) ? [[key, Math.round((value - start) / dayMs)]] : [];
        }));
        const draft: Kitchen = { id: kitchen?.id ?? nextId, label: name.value.trim(), address: address.value.trim(), manager: manager.value, volume: selectedVolume, services: selected, priorDone };
        const problem = kitchenError(draft, kitchens, areaManagers);
        if (problem) { error.textContent = problem; error.hidden = false; return false; }
        if (kitchen) {
          const previous = structuredClone(kitchen);
          const cancelled = visits.flatMap((visit, index) => visit.kitchen === kitchen.id && visit.status !== 'Completed' && !selected.includes(visit.service) ? [{ visit, index }] : []);
          for (const item of cancelled.slice().reverse()) visits.splice(item.index, 1);
          Object.assign(kitchen, draft); const undoActivity = logActivities([{ kitchen: kitchen.id, title: 'Kitchen details edited', detail: '' }]); refresh();
          bench.report(`Kitchen updated. ${cancelled.length ? `${cancelled.length} open ${cancelled.length === 1 ? 'visit' : 'visits'} cancelled.` : kitchen.label}`, () => {
            Object.assign(kitchen, previous); for (const item of cancelled) visits.splice(Math.min(item.index, visits.length), 0, item.visit); undoActivity(); refresh();
          });
          if (fromView) { showKitchen(kitchen); return false; }
        } else {
          nextId++; kitchens.push(draft); const undoActivity = logActivities([{ kitchen: draft.id, title: 'Kitchen added', detail: '' }]); bench.resetPage(); refresh();
          bench.report(`Kitchen added. ${draft.label}`, () => { const index = kitchens.indexOf(draft); if (index >= 0) kitchens.splice(index, 1); undoActivity(); refresh(); });
          showKitchen(draft); return false;
        }
        return true;
      }, remove, kitchen ? 'Save Changes' : 'Add Kitchen', () => volumeRoot.unmount(), { close: { label: 'Close', className: 'visit-book-close' } });
    }

    function removeKitchen(kitchen: Kitchen) {
      const removed = visits.flatMap((visit, index) => visit.kitchen === kitchen.id ? [{ visit, index }] : []);
      bench.form('Remove kitchen?', [make('p', `${kitchen.label} and its ${removed.length} visits will leave the plan.`)], () => {
        const index = kitchens.indexOf(kitchen); if (index < 0) return;
        kitchens.splice(index, 1); for (const item of removed.slice().reverse()) visits.splice(item.index, 1); refresh();
        bench.report(`Kitchen removed. ${kitchen.label} left the plan with ${removed.length} visits.`, () => {
          kitchens.splice(Math.min(index, kitchens.length), 0, kitchen); for (const item of removed) visits.splice(Math.min(item.index, visits.length), 0, item.visit); refresh();
        });
      }, undefined, 'Remove Kitchen');
    }

    function bookVisit(preset?: { kitchen: Kitchen; day?: number; service?: Service }, editing?: Visit, origin?: Kitchen) {
      const kitchen = selectOptions('Kitchen', [{ value: '', label: 'Pick a kitchen' }, ...kitchens.map(item => ({ value: String(item.id), label: item.label }))], editing ? String(editing.kitchen) : preset ? String(preset.kitchen.id) : '');
      kitchen.disabled = !!editing; kitchen.required = true;
      const type = selectOptions('Service', [{ value: '', label: 'Pick a kitchen first' }], ''); type.required = true;
      const date = input('Visit date', editing ? iso(editing.day) : preset?.day != null ? iso(preset.day) : '', 'date'); date.hidden = true; date.removeAttribute('aria-label');
      const dateTrigger = button('', () => openBookingCalendar()); dateTrigger.className = 'visit-book-date-trigger'; dateTrigger.dataset.icon = 'calendar-add'; dateTrigger.setAttribute('aria-label', 'Visit date'); dateTrigger.setAttribute('aria-haspopup', 'dialog');
      const dateDescription = make('span', '', 'visit-date-description'); dateDescription.id = 'visit-date-description'; dateTrigger.setAttribute('aria-describedby', dateDescription.id);
      const updateDateLabel = () => { const value = date.value ? dateLabel.format(new Date(`${date.value}T00:00:00Z`)) : ''; dateTrigger.textContent = value || 'Pick a day'; dateDescription.textContent = value ? `Selected ${value}` : 'No date selected'; dateTrigger.classList.toggle('empty', !date.value); };
      updateDateLabel();
      const time = selectOptions('Time', Object.entries(visitWindows).map(([value, label]) => ({ value, label })), '');
      const crew = personSelect('Technician', [''], ''); crew.setOptions([{ value: '', label: 'Pick a service first' }]); crew.required = true;
      const crewHelp = make('small', '', 'visit-book-help');
      const dateHelp = make('small', '', 'visit-book-help');
      let selectedStatus: Status = editing?.status === 'Booked' ? 'Booked' : 'Awaiting';
      const statusGroup = make('div');
      const statusRoot = createRoot(statusGroup);
      const renderVisitStatus = () => statusRoot.render(createElement(RadioGroup, {
        label: 'Status', name: 'visit-status', className: 'visit-book-status', value: selectedStatus,
        options: [{ value: 'Awaiting', label: 'Awaiting' }, { value: 'Booked', label: 'Confirmed' }],
        onChange: (value: string | number) => { if (value === 'Awaiting' || value === 'Booked') { selectedStatus = value; renderVisitStatus(); } },
      }));
      renderVisitStatus();
      const statusHelp = make('small', 'Confirmed once the vendor has said yes to the day', 'visit-book-help');
      const notes = createControl(document, 'textarea'); notes.setAttribute('aria-label', 'Notes for the Crew'); notes.placeholder = 'Access, parking, who to ask for'; notes.maxLength = 160; notes.value = editing?.notes ?? '';
      const error = make('p', '', 'visit-book-error'); error.setAttribute('role', 'alert'); error.hidden = true;
      const description = make('p', 'One visit a day per kitchen.', 'visit-book-description');
      const body = make('div', '', 'visit-book-editor visit-book-editor--visit');
      const firstRow = make('div', '', 'visit-book-row'); firstRow.append(field('Kitchen', kitchen), field('Service', type));
      const dateField = make('div', '', 'workbench-field'); dateField.append(make('span', 'Date'), dateTrigger, dateDescription, date, dateHelp);
      const secondRow = make('div', '', 'visit-book-row'); secondRow.append(dateField, field('Time', time));
      const crewField = field('Technician', crew); crewField.append(crewHelp);
      body.append(description, firstRow, secondRow, crewField, statusGroup, statusHelp, field('Notes for the Crew', notes), error);
      function rebuildServices(selected?: Service) {
        const unit = kitchen.value ? kitchens.find(item => item.id === Number(kitchen.value)) : undefined;
        type.setOptions([{ value: '', label: unit ? 'Pick a service' : 'Pick a kitchen first' }, ...(unit?.services ?? []).map(key => ({ value: key, label: services[key].label }))]);
        type.disabled = !unit; type.value = selected && unit?.services.includes(selected) ? selected : '';
        rebuildCrew();
      }
      function rebuildCrew() {
        const key = type.value as Service | '';
        crew.setOptions([{ value: '', label: key ? 'Pick a technician' : 'Pick a service first' }, ...technicians.filter(person => person.service === key).map(person => ({ value: person.name, label: person.name }))]);
        crew.disabled = !key;
        if (key) {
          const day = date.value ? Math.round((date.valueAsNumber - start) / dayMs) : 4;
          const suggestion = suggestCrew(key, day, visits, technicians); crew.value = suggestion.crew; time.value = suggestion.window;
          crewHelp.textContent = `Only crews certified for ${services[key].label.toLowerCase()}`;
        } else { crewHelp.textContent = ''; }
        const unit = kitchen.value ? kitchens.find(item => item.id === Number(kitchen.value)) : undefined;
        description.textContent = unit ? key ? `${services[key].label} at ${unit.label}` : unit.label : 'One visit a day per kitchen.';
        const state = unit && key ? serviceStates(unit, visits).find(item => item.service === key) : undefined;
        dateHelp.textContent = state ? `Due ${weekday.format(fixedDate(state.due))}, ${dateLabel.format(fixedDate(state.due))}` : '';
        error.hidden = true;
      }
      kitchen.onchange = () => rebuildServices(type.value as Service);
      type.onchange = rebuildCrew;
      date.onchange = () => { updateDateLabel(); rebuildCrew(); };
      time.onchange = () => { error.hidden = true; };
      crew.onchange = () => { error.hidden = true; };
      rebuildServices(editing?.service ?? preset?.service);
      if (editing) { crew.value = editing.crew; time.value = editing.window ?? 'opening'; }
      function openBookingCalendar() {
        void bench.grid.getPlugins().then(plugins => {
          const popover = plugins.find(plugin => plugin instanceof GridPopoverPlugin);
          if (!popover || !dateTrigger.isConnected) return;
          const host = make('div', '', 'visit-calendar visit-date-popup');
          const root = createRoot(host);
          const selected = date.value ? date.value as ISODateString : undefined;
          popover.open(dateTrigger, { label: 'Choose visit date', content: host, cleanup: () => root.unmount(), align: 'start', className: 'visit-popover' });
          root.render(createElement(CalendarPicker, {
            selected,
            defaultMonth: `${(selected ?? iso(4)).slice(0, 7)}-01` as ISODateString,
            referenceDate: iso(4), weekStartsOn: 0, showOutsideDays: true, fixedWeeks: false, enableYearView: false,
            formatWeekday: (value: string) => weekday.format(new Date(`${value}T00:00:00Z`)).slice(0, 2),
            isDateDisabled: (value: string) => {
              const day = Math.round((Date.parse(`${value}T00:00:00Z`) - start) / dayMs);
              return day < 4 || (!!kitchen.value && visits.some(item => item !== editing && item.kitchen === Number(kitchen.value) && item.day === day));
            },
            onSelectionChange: (value: ISODateString | undefined) => {
              if (!value) return;
              date.value = value; date.dispatchEvent(new Event('change', { bubbles: true })); popover.close(true);
            },
          }));
          requestAnimationFrame(() => popover.position());
        });
      }
      bench.form(editing ? 'Edit Visit' : 'Book Visit', [body], () => {
        if (!kitchen.value) { error.textContent = 'Pick the kitchen to visit.'; error.hidden = false; return false; }
        const draft: Visit = { kitchen: Number(kitchen.value), service: type.value as Service, day: Math.round((date.valueAsNumber - start) / dayMs), window: time.value as VisitWindow, crew: crew.value, status: selectedStatus, notes: notes.value.trim(), report: '' };
        const problem = bookingError(draft, kitchens, visits, technicians, editing);
        if (problem) { error.textContent = problem; error.hidden = false; return false; }
        if (editing) {
          const previous = { ...editing }; Object.assign(editing, draft); const undoActivity = logActivities([{ kitchen: draft.kitchen, title: `${services[draft.service].label} edited`, detail: activityDate(draft.day) }]); refresh();
          bench.report(`Visit updated. ${services[draft.service].label} at ${kitchens.find(item => item.id === draft.kitchen)?.label}.`, () => { Object.assign(editing, previous); undoActivity(); refresh(); });
        } else {
          visits.push(draft); const undoActivity = logActivities([{ kitchen: draft.kitchen, title: `${services[draft.service].label} booked`, detail: activityDate(draft.day) }]); refresh();
          bench.report(`Visit booked. ${services[draft.service].label} at ${kitchens.find(item => item.id === draft.kitchen)?.label} ${draft.status === 'Awaiting' ? "awaits its vendor's confirmation" : 'is confirmed'}.`, () => { const index = visits.indexOf(draft); if (index >= 0) visits.splice(index, 1); undoActivity(); refresh(); });
        }
        if (origin) { showKitchen(origin); return false; }
        return true;
      }, origin ? button('Back', () => showKitchen(origin)) : undefined, editing ? 'Save Changes' : 'Book Visit', () => statusRoot.unmount(), { close: { label: 'Close', className: 'visit-book-close' } });
    }

    function showVisit(visit: Visit, anchor: HTMLElement) {
      visit = visits.find(item => item.kitchen === visit.kitchen && item.day === visit.day && item.service === visit.service) ?? visit;
      void bench.grid.getPlugins().then(plugins => {
        const popover = plugins.find(plugin => plugin instanceof GridPopoverPlugin);
        const kitchen = kitchens.find(item => item.id === visit.kitchen);
        if (!popover || !kitchen || !anchor.isConnected) return;
        const insideKitchen = !!anchor.closest('.visit-kitchen-view');
        const effective = effectiveStatus(visit);
        const state = serviceStates(kitchen, visits).find(item => item.service === visit.service);
        const body = make('div', '', 'visit-popover__body');
        const header = make('div', '', 'visit-popover__header');
        const title = make('div', '', 'visit-popover__title'); title.append(make('strong', services[visit.service].label), make('small', kitchen.label));
        const badge = make('span', effective === 'Booked' ? 'Confirmed' : effective === 'Completed' ? 'Done' : effective, `visit-popover__badge visit-popover__badge--${effective.toLowerCase()}`);
        const menu = make('details', '', 'visit-popover__menu');
        const menuTrigger = createControl(document, 'summary'); menuTrigger.textContent = '⋯'; menuTrigger.setAttribute('aria-label', 'More visit actions'); menuTrigger.setAttribute('role', 'button');
        const menuItems = make('div', '', 'visit-popover__menu-items');
        menuTrigger.setAttribute('aria-haspopup', 'menu');
        const removeVisit = () => {
          popover.close();
          bench.form(effective === 'Completed' ? 'Delete record?' : 'Cancel visit?', [make('p', `${services[visit.service].label} at ${kitchen.label}`)], () => {
            const index = visits.indexOf(visit); if (index < 0) return;
            visits.splice(index, 1); const undoActivity = logActivities([{ kitchen: visit.kitchen, title: `${services[visit.service].label} ${effective === 'Completed' ? 'record deleted' : 'cancelled'}`, detail: activityDate(visit.day) }]); refresh();
            bench.report(effective === 'Completed' ? 'Record deleted.' : 'Visit cancelled.', () => { visits.splice(Math.min(index, visits.length), 0, visit); undoActivity(); refresh(); });
          }, undefined, effective === 'Completed' ? 'Delete Record' : 'Cancel Visit');
        };
        let menuRoot: ReturnType<typeof createRoot> | undefined;
        const openBody = () => {
          popover.open(anchor, { label: services[visit.service].label, content: body, positionAnchor: anchor.closest<HTMLElement>('.rgCell') ?? anchor, className: 'visit-popover', cleanup: () => { menuRoot?.unmount(); menuRoot = undefined; } });
          menuRoot = createRoot(menuItems);
          menuRoot.render(createElement(Menu, { label: 'Visit actions', onClose: () => { menu.open = false; menuTrigger.focus(); } },
            createElement(MenuItem, { onClick: () => { popover.close(); showKitchen(kitchen); } }, 'View Kitchen'),
            effective !== 'Completed' ? createElement(MenuItem, { onClick: () => { popover.close(); bookVisit(undefined, visit); } }, 'Edit Visit') : null,
            createElement(MenuItem, { onClick: removeVisit }, effective === 'Completed' ? 'Delete Record' : 'Cancel Visit')));
        };
        menu.append(menuTrigger, menuItems); header.append(title, badge, menu); body.append(header);
        const rows = make('dl', '', 'visit-popover__rows');
        const addRow = (label: string, value: string) => { rows.append(make('dt', label), make('dd', value)); };
        const fullDate = (day: number) => `${weekday.format(fixedDate(day))}, ${dateLabel.format(fixedDate(day))}`;
        addRow('Date', fullDate(visit.day));
        addRow('Time', visitWindows[visit.window ?? 'opening']);
        const vendor: Record<Service, [string, string, string]> = { clean: ['Nightshift Cleaning', '(312) 555-0110', 'nightshift.dispatch@example.com'], pest: ['Brightline Pest', '(312) 555-0124', 'brightline.dispatch@example.com'], grease: ['Lakeshore Grease', '(312) 555-0137', 'lakeshore.dispatch@example.com'], hood: ['Clearflue Hoods', '(312) 555-0141', 'clearflue.dispatch@example.com'], fire: ['Redwater Fire', '(312) 555-0158', 'redwater.dispatch@example.com'], fridge: ['Coldcourt Mechanical', '(312) 555-0163', 'coldcourt.dispatch@example.com'] };
        rows.append(make('dt', 'Crew'));
        const crewValue = make('dd', '', 'visit-popover__crew');
        const avatar = make('span', visit.crew ? visit.crew.split(' ').map(part => part[0]).join('').slice(0, 2) : '?', 'visit-popover__avatar'); avatar.setAttribute('aria-hidden', 'true');
        const person = make('span'); person.append(make('span', visit.crew || 'Unassigned'), make('small', vendor[visit.service][0])); crewValue.append(avatar, person); rows.append(crewValue);
        const contact = make('dd'); const phone = make('a', vendor[visit.service][1], 'visit-popover__contact'); phone.href = `tel:${vendor[visit.service][1].replace(/[^+0-9]/g, '')}`; const email = make('a', '', 'visit-popover__contact visit-popover__email'); email.href = `mailto:${vendor[visit.service][2]}?subject=${encodeURIComponent(`${services[visit.service].label} at ${kitchen.label}, ${fullDate(visit.day)}`)}`; email.setAttribute('aria-label', `Email ${vendor[visit.service][0]}`); contact.className = 'visit-popover__contact-row'; contact.append(phone, email); rows.append(make('dt', 'Contact'), contact);
        if (visit.report) addRow('Report', visit.report);
        if (state) {
          const delta = visit.day - state.due;
          addRow('Cycle', effective === 'Completed' ? `Every ${services[visit.service][kitchen.volume]} days` : effective === 'Missed' ? `Was due ${dateLabel.format(fixedDate(state.due))}` : delta > 0 ? `${delta} ${delta === 1 ? 'day' : 'days'} after due ${dateLabel.format(fixedDate(state.due))}` : `Covers due ${dateLabel.format(fixedDate(state.due))}`);
          if (effective === 'Missed') rows.lastElementChild?.classList.add('visit-popover__overdue');
        }
        if (visit.notes) addRow('Notes', visit.notes);
        body.append(rows);
        const update = (draft: Partial<Visit>, message: string) => {
          const previous = { ...visit }; Object.assign(visit, draft);
          const verb = draft.status === 'Completed' ? 'signed off' : draft.status === 'Booked' ? 'confirmed' : 'moved';
          const undoActivity = logActivities([{ kitchen: visit.kitchen, title: `${services[visit.service].label} ${verb}`, detail: activityDate(visit.day) }]);
          popover.close(); refresh();
          if (insideKitchen) showKitchen(kitchen);
          bench.report(message, () => { Object.assign(visit, previous); undoActivity(); refresh(); });
        };
        const openDateForm = (mode: 'move' | 'signoff') => {
          const form = make('form', '', `visit-popover__form visit-calendar-form visit-calendar-form--${mode}`);
          form.append(make('strong', mode === 'move' ? 'Move Visit' : 'Sign Off Visit'));
          form.append(make('small', mode === 'move' ? `${services[visit.service].label} is due ${state ? dateLabel.format(fixedDate(state.due)) : 'today'}, the underlined day` : `${services[visit.service].label}, on the day the crew came`));
          const calendar = make('div', '', 'visit-calendar'); form.append(calendar);
          const report = input('Report No.'); report.maxLength = 24; report.placeholder = 'Job sheet or certificate';
          if (mode === 'signoff') form.append(field('Report No.', report));
          const actions = make('div', '', 'visit-popover__actions');
          const back = button('Back', openBody);
          actions.append(back);
          if (mode === 'signoff') { const submit = createButtonElement(document, { label: 'Sign Off', className: 'rv-btn rv-btn-primary primary' }); submit.type = 'submit'; submit.dataset.visitIcon = 'check'; actions.append(submit); }
          form.append(actions);
          let selected = iso(mode === 'move' ? visit.day : Math.min(visit.day, 4));
          const root = createRoot(calendar);
          const dateToDay = (value: string) => Math.round((Date.parse(`${value}T00:00:00Z`) - start) / dayMs);
          const render = () => root.render(createElement(CalendarPicker, {
            selected,
            defaultMonth: `${selected.slice(0, 7)}-01` as ISODateString,
            referenceDate: iso(4), weekStartsOn: 0, showOutsideDays: true, fixedWeeks: false, enableYearView: false,
            formatWeekday: (date: string) => weekday.format(new Date(`${date}T00:00:00Z`)).slice(0, 2),
            isDateDisabled: (date: string) => (mode === 'move' ? dateToDay(date) < 4 : dateToDay(date) > 4) || visits.some(item => item !== visit && item.kitchen === visit.kitchen && item.day === dateToDay(date)),
            dayClassName: (date: string) => mode === 'move' && state && date === iso(state.due) ? 'visit-calendar__due' : undefined,
            onSelectionChange: (date: ISODateString | undefined) => {
              if (!date) return;
              selected = date;
              if (mode === 'move') { const day = dateToDay(date); if (day === visit.day) popover.close(); else update({ day, status: 'Awaiting' }, `Visit moved. ${services[visit.service].label} awaits its vendor's confirmation.`); }
              else render();
            },
          }));
          form.onsubmit = event => {
            event.preventDefault();
            update({ day: dateToDay(selected), status: 'Completed', report: report.value.trim() }, `${services[visit.service].label} signed off.`);
          };
          popover.open(anchor, { label: mode === 'move' ? 'Move Visit' : 'Sign Off Visit', content: form, cleanup: () => root.unmount(), positionAnchor: anchor.closest<HTMLElement>('.rgCell') ?? anchor, className: 'visit-popover' });
          render(); requestAnimationFrame(() => popover.position());
        };
        if (effective !== 'Completed') {
          const actions = make('div', '', 'visit-popover__actions');
          const moveButton = button('Reschedule', () => openDateForm('move')); moveButton.dataset.visitIcon = 'calendar'; actions.append(moveButton);
          if (effective === 'Awaiting') actions.append(button('Confirm', () => update({ status: 'Booked' }, 'Visit confirmed.'), true));
          else if (effective === 'Missed' || visit.day <= 4) { const done = button('Mark Done', () => openDateForm('signoff'), true); done.dataset.visitIcon = 'check'; actions.append(done); }
          body.append(actions);
        }
        openBody();
      });
    }
  },
};
