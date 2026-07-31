import type { ShiftWeekCalendarOption, ShiftWeekDemoCalendar, ShiftWeekDemoView, ShiftWeekWorkspaceView } from '../../data';

export const SCHEDULER_HEADER_TAG = 'revogr-scheduler-header';

export interface SchedulerHeaderModel {
  readonly workspaceView: ShiftWeekWorkspaceView;
  readonly activeView: ShiftWeekDemoView;
  readonly activeCalendar: ShiftWeekDemoCalendar;
  readonly title: string;
  readonly subtitle: string;
  readonly views: readonly ShiftWeekDemoView[];
  readonly viewLabels: Readonly<Record<ShiftWeekDemoView, string>>;
  readonly calendarOptions: readonly ShiftWeekCalendarOption[];
}

export interface SchedulerHeaderNavigateDetail {
  readonly action: 'previous' | 'next' | 'today';
}

export interface SchedulerHeaderViewChangeDetail {
  readonly view: ShiftWeekDemoView;
}

export interface SchedulerHeaderWorkspaceChangeDetail {
  readonly view: ShiftWeekWorkspaceView;
}

export interface SchedulerHeaderCalendarChangeDetail {
  readonly calendar: ShiftWeekDemoCalendar;
}

const workspaceViews: readonly { readonly view: ShiftWeekWorkspaceView; readonly label: string }[] = [
  { view: 'calendar', label: 'Calendar' },
  { view: 'resource', label: 'Resource' },
  { view: 'table', label: 'Table' },
];

/** Framework-neutral scheduler range navigation and view header. */
export class SchedulerHeaderElement extends HTMLElement {
  private currentModel: SchedulerHeaderModel | null = null;
  private workspace: HTMLElement | null = null;
  private heading: HTMLElement | null = null;
  private views: HTMLElement | null = null;
  private calendarSelect: HTMLSelectElement | null = null;
  private calendarDescription: HTMLElement | null = null;

  constructor() {
    super();
    this.addEventListener('click', this.handleClick);
    this.addEventListener('change', this.handleChange);
  }

  /** Controlled render model. Model updates never emit user-interaction events. */
  set model(model: SchedulerHeaderModel) {
    if (this.currentModel
      && this.currentModel.workspaceView === model.workspaceView
      && this.currentModel.activeView === model.activeView
      && this.currentModel.activeCalendar === model.activeCalendar
      && this.currentModel.title === model.title
      && this.currentModel.subtitle === model.subtitle
      && this.currentModel.views === model.views
      && this.currentModel.viewLabels === model.viewLabels
      && this.currentModel.calendarOptions === model.calendarOptions) return;
    this.currentModel = model;
    this.render();
  }

  get model(): SchedulerHeaderModel | null {
    return this.currentModel;
  }

  connectedCallback(): void {
    this.classList.add('event-scheduler-shift-week-toolbar');
    this.setAttribute('aria-label', 'Shift scheduler navigation');
    this.render();
  }

  private ensureStructure(): void {
    if (this.heading) return;
    this.workspace = document.createElement('nav');
    this.workspace.className = 'event-scheduler-shift-week-toolbar__workspace rv-segmented-switch';
    this.workspace.setAttribute('role', 'tablist');
    this.workspace.setAttribute('aria-label', 'Scheduler workspace');

    const nav = document.createElement('div');
    nav.className = 'event-scheduler-shift-week-toolbar__nav';
    nav.append(
      this.createNavigationButton('previous', 'Previous range', '‹'),
      this.createNavigationButton('next', 'Next range', '›'),
      this.createNavigationButton('today', '', 'Today'),
    );

    this.heading = document.createElement('div');
    this.heading.className = 'event-scheduler-shift-week-toolbar__heading';
    const range = document.createElement('div');
    range.className = 'event-scheduler-shift-week-toolbar__range';
    range.append(nav, this.heading);

    this.views = document.createElement('div');
    this.views.className = 'event-scheduler-shift-week-toolbar__views rv-segmented-switch';
    this.views.setAttribute('role', 'group');
    this.views.setAttribute('aria-label', 'Scheduler view');

    const calendar = document.createElement('label');
    calendar.className = 'event-scheduler-shift-week-toolbar__calendar';
    const calendarLabel = document.createElement('span');
    calendarLabel.textContent = 'Calendar';
    this.calendarSelect = document.createElement('select');
    this.calendarSelect.setAttribute('aria-label', 'Calendar preset');
    this.calendarSelect.dataset.schedulerCalendar = '';
    this.calendarDescription = document.createElement('small');
    calendar.append(calendarLabel, this.calendarSelect, this.calendarDescription);
    const end = document.createElement('div');
    end.className = 'event-scheduler-shift-week-toolbar__end';
    end.append(this.views, calendar);
    this.append(this.workspace, range, end);
  }

  private createNavigationButton(action: SchedulerHeaderNavigateDetail['action'], ariaLabel: string, label: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action === 'today'
      ? 'event-scheduler-shift-week-toolbar__today'
      : 'event-scheduler-shift-week-toolbar__icon';
    button.dataset.schedulerNavigate = action;
    if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
    button.textContent = label;
    return button;
  }

  private render(): void {
    if (!this.isConnected || !this.currentModel) return;
    this.ensureStructure();
    const model = this.currentModel;
    this.classList.toggle('event-scheduler-shift-week-toolbar--workspace-only', model.workspaceView !== 'calendar');

    const workspaceButtons = workspaceViews.map(({ view, label }) => {
      const active = model.workspaceView === view;
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.className = [
        'rv-segmented-switch-item',
        active ? 'on' : '',
      ].filter(Boolean).join(' ');
      button.dataset.schedulerWorkspace = view;
      button.setAttribute('aria-selected', String(active));
      button.textContent = label;
      return button;
    });
    this.workspace?.replaceChildren(...workspaceButtons);

    const title = document.createElement('strong');
    title.textContent = model.title;
    const subtitle = document.createElement('span');
    subtitle.textContent = model.subtitle;
    this.heading?.replaceChildren(title, subtitle);

    const viewButtons = model.views.map((view) => {
      const active = model.activeView === view;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = [
        'rv-segmented-switch-item',
        'event-scheduler-shift-week-toolbar__view',
        active ? 'on' : '',
        active ? 'event-scheduler-shift-week-toolbar__view--active' : '',
      ].filter(Boolean).join(' ');
      button.dataset.schedulerView = view;
      button.setAttribute('aria-pressed', String(active));
      button.textContent = model.viewLabels[view];
      return button;
    });
    this.views?.replaceChildren(...viewButtons);

    if (this.calendarSelect) {
      const options = model.calendarOptions.map((option) => {
        const item = document.createElement('option');
        item.value = option.id;
        item.textContent = option.label;
        return item;
      });
      this.calendarSelect.replaceChildren(...options);
      this.calendarSelect.value = model.activeCalendar;
    }
    if (this.calendarDescription) {
      this.calendarDescription.textContent = model.calendarOptions.find(({ id }) => id === model.activeCalendar)?.description ?? '';
    }
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    const workspace = target.closest<HTMLButtonElement>('[data-scheduler-workspace]');
    if (workspace?.dataset.schedulerWorkspace) {
      this.emit<SchedulerHeaderWorkspaceChangeDetail>('scheduler-header-workspace-change', {
        view: workspace.dataset.schedulerWorkspace as ShiftWeekWorkspaceView,
      });
      return;
    }
    const navigation = target.closest<HTMLButtonElement>('[data-scheduler-navigate]');
    if (navigation?.dataset.schedulerNavigate) {
      this.emit<SchedulerHeaderNavigateDetail>('scheduler-header-navigate', {
        action: navigation.dataset.schedulerNavigate as SchedulerHeaderNavigateDetail['action'],
      });
      return;
    }
    const view = target.closest<HTMLButtonElement>('[data-scheduler-view]');
    if (view?.dataset.schedulerView) {
      this.emit<SchedulerHeaderViewChangeDetail>('scheduler-header-view-change', {
        view: view.dataset.schedulerView as ShiftWeekDemoView,
      });
    }
  };

  private readonly handleChange = (event: Event): void => {
    const select = event.target as HTMLSelectElement;
    if (select.matches('[data-scheduler-calendar]')) {
      this.emit<SchedulerHeaderCalendarChangeDetail>('scheduler-header-calendar-change', {
        calendar: select.value as ShiftWeekDemoCalendar,
      });
    }
  };

  private emit<Detail>(name: string, detail: Detail): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }
}

export function defineSchedulerHeader(): void {
  if (!customElements.get(SCHEDULER_HEADER_TAG)) {
    customElements.define(SCHEDULER_HEADER_TAG, SchedulerHeaderElement);
  }
}
