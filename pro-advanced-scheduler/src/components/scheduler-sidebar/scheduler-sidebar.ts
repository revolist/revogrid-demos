import type { ShiftWeekTeamMember, ShiftWeekWorkspaceView } from '../../data';

export const SCHEDULER_SIDEBAR_TAG = 'revogr-scheduler-sidebar';

export interface SchedulerSidebarModel {
  readonly workspaceView: ShiftWeekWorkspaceView;
  readonly searchQuery: string;
  readonly teamMembers: readonly ShiftWeekTeamMember[];
}

/** Event payload emitted when the active scheduler workspace changes. */
export interface SchedulerSidebarWorkspaceChangeDetail {
  readonly view: ShiftWeekWorkspaceView;
}

/** Event payload emitted as the scheduler search input changes. */
export interface SchedulerSidebarSearchChangeDetail {
  readonly query: string;
}

const workspaceViews: readonly { readonly view: ShiftWeekWorkspaceView; readonly label: string }[] = [
  { view: 'calendar', label: 'Calendar' },
  { view: 'resource', label: 'Resource' },
  { view: 'table', label: 'Table' },
];

/** Framework-neutral scheduler navigation and team sidebar. */
export class SchedulerSidebarElement extends HTMLElement {
  private currentModel: SchedulerSidebarModel | null = null;
  private searchInput: HTMLInputElement | null = null;
  private nav: HTMLElement | null = null;
  private team: HTMLElement | null = null;

  constructor() {
    super();
    this.addEventListener('click', this.handleClick);
    this.addEventListener('input', this.handleInput);
  }

  /** Controlled render model. Setting it updates the existing light-DOM controls. */
  set model(model: SchedulerSidebarModel) {
    if (this.currentModel
      && this.currentModel.workspaceView === model.workspaceView
      && this.currentModel.searchQuery === model.searchQuery
      && this.currentModel.teamMembers === model.teamMembers) return;
    this.currentModel = model;
    this.render();
  }

  get model(): SchedulerSidebarModel | null {
    return this.currentModel;
  }

  connectedCallback(): void {
    this.classList.add('event-scheduler-shift-week-sidebar');
    this.setAttribute('aria-label', 'Scheduler navigation');
    this.render();
  }

  private ensureStructure(): void {
    if (this.searchInput) return;

    const brand = document.createElement('div');
    brand.className = 'event-scheduler-shift-week-brand';
    const mark = document.createElement('span');
    mark.className = 'event-scheduler-shift-week-brand__mark';
    mark.textContent = 'OS';
    const copy = document.createElement('span');
    copy.className = 'event-scheduler-shift-week-brand__copy';
    const name = document.createElement('strong');
    name.textContent = 'Ops Studio';
    const context = document.createElement('small');
    context.textContent = 'Workspace';
    copy.append(name, context);
    brand.append(mark, copy);

    const newEventButton = document.createElement('button');
    newEventButton.type = 'button';
    newEventButton.className = 'event-scheduler-shift-week-new-event';
    newEventButton.dataset.schedulerNewEvent = '';
    newEventButton.textContent = 'New event';

    const search = document.createElement('label');
    search.className = 'event-scheduler-shift-week-search';
    const searchLabel = document.createElement('span');
    searchLabel.textContent = 'Search';
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'search';
    this.searchInput.placeholder = 'Search...';
    this.searchInput.dataset.schedulerSearch = '';
    search.append(searchLabel, this.searchInput);

    this.nav = document.createElement('nav');
    this.nav.className = 'event-scheduler-shift-week-nav';
    this.nav.setAttribute('aria-label', 'Scheduler sections');
    this.team = document.createElement('div');
    this.team.className = 'event-scheduler-shift-week-team';
    this.append(brand, newEventButton, search, this.nav, this.team);
  }

  private render(): void {
    if (!this.isConnected || !this.currentModel) return;
    this.ensureStructure();
    const model = this.currentModel;

    if (this.searchInput) {
      this.searchInput.value = model.searchQuery;
    }

    const navLabel = document.createElement('span');
    navLabel.textContent = 'Views';
    const navButtons = workspaceViews.map(({ view, label }) => {
      const button = document.createElement('button');
      const active = model.workspaceView === view;
      button.type = 'button';
      button.className = [
        'event-scheduler-shift-week-nav__item',
        active ? 'event-scheduler-shift-week-nav__item--active' : '',
      ].filter(Boolean).join(' ');
      button.dataset.schedulerWorkspace = view;
      button.setAttribute('aria-pressed', String(active));
      button.textContent = label;
      return button;
    });
    this.nav?.replaceChildren(navLabel, ...navButtons);

    const teamLabel = document.createElement('span');
    teamLabel.textContent = 'Team';
    const teamRows = model.teamMembers.map((member) => {
      const row = document.createElement('div');
      row.className = 'event-scheduler-shift-week-team__row';
      const avatar = document.createElement('span');
      avatar.className = 'event-scheduler-shift-week-avatar';
      avatar.style.setProperty('--shift-week-avatar-color', member.color);
      avatar.textContent = member.initials;
      const memberName = document.createElement('strong');
      memberName.textContent = member.name;
      const count = document.createElement('small');
      count.textContent = String(member.count);
      row.append(avatar, memberName, count);
      return row;
    });
    this.team?.replaceChildren(teamLabel, ...teamRows);
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-scheduler-new-event]')) {
      this.emit('scheduler-sidebar-new-event');
      return;
    }
    const button = target.closest<HTMLButtonElement>('[data-scheduler-workspace]');
    if (button?.dataset.schedulerWorkspace) {
      this.emit<SchedulerSidebarWorkspaceChangeDetail>('scheduler-sidebar-workspace-change', {
        view: button.dataset.schedulerWorkspace as ShiftWeekWorkspaceView,
      });
    }
  };

  private readonly handleInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (input.matches('[data-scheduler-search]')) {
      this.emit<SchedulerSidebarSearchChangeDetail>('scheduler-sidebar-search-change', { query: input.value });
    }
  };

  private emit<Detail = undefined>(name: string, detail?: Detail): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }
}

export function defineSchedulerSidebar(): void {
  if (!customElements.get(SCHEDULER_SIDEBAR_TAG)) {
    customElements.define(SCHEDULER_SIDEBAR_TAG, SchedulerSidebarElement);
  }
}
