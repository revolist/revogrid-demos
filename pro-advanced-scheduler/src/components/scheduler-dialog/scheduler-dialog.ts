import type { ShiftWeekNewEventForm, ShiftWeekTeamMember } from '../../data';

export const SCHEDULER_DIALOG_TAG = 'revogr-scheduler-dialog';

export interface SchedulerDialogOption<Value extends string = string> {
  readonly id: Value;
  readonly label: string;
}

export interface SchedulerDialogModel {
  readonly form: ShiftWeekNewEventForm;
  readonly teamMembers: readonly ShiftWeekTeamMember[];
  readonly typeOptions: readonly SchedulerDialogOption<ShiftWeekNewEventForm['type']>[];
  readonly statusOptions: readonly SchedulerDialogOption<ShiftWeekNewEventForm['status']>[];
}

/** Event payload emitted after the dialog validates and normalizes its native form. */
export interface SchedulerDialogSubmitDetail {
  readonly form: ShiftWeekNewEventForm;
}

/** Framework-neutral new scheduler event dialog. */
export class SchedulerDialogElement extends HTMLElement {
  private currentModel: SchedulerDialogModel | null = null;

  constructor() {
    super();
    this.addEventListener('click', this.handleClick);
    this.addEventListener('submit', this.handleSubmit);
  }

  /** Controlled dialog model. A null value clears and hides the dialog. */
  set model(model: SchedulerDialogModel | null) {
    if (this.modelsEqual(this.currentModel, model)) return;
    this.currentModel = model;
    this.render();
  }

  get model(): SchedulerDialogModel | null {
    return this.currentModel;
  }

  connectedCallback(): void {
    this.classList.add('event-scheduler-shift-week-dialog');
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    this.setAttribute('aria-labelledby', 'shift-week-new-event-title');
    this.render();
  }

  private render(): void {
    if (!this.isConnected) return;
    this.replaceChildren();
    this.hidden = !this.currentModel;
    if (!this.currentModel) return;
    const model = this.currentModel;

    const form = document.createElement('form');
    form.className = 'event-scheduler-shift-week-dialog__panel';
    form.dataset.schedulerDialogForm = '';

    const header = document.createElement('div');
    header.className = 'event-scheduler-shift-week-dialog__header';
    const heading = document.createElement('div');
    const title = document.createElement('strong');
    title.id = 'shift-week-new-event-title';
    title.textContent = 'New event';
    const summary = document.createElement('span');
    summary.textContent = `${model.form.date} · ${model.form.startTime}-${model.form.endTime}`;
    heading.append(title, summary);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'event-scheduler-shift-week-dialog__close';
    close.dataset.schedulerDialogClose = '';
    close.setAttribute('aria-label', 'Close new event');
    close.textContent = '×';
    header.append(heading, close);

    const body = document.createElement('div');
    body.className = 'event-scheduler-shift-week-dialog__body';
    body.append(
      this.createInput('Event', 'title', model.form.title, 'text', true),
      this.createInput('Date', 'date', model.form.date, 'date'),
      this.createSelect('Assignee', 'resourceId', String(model.form.resourceId), model.teamMembers.map((member) => ({ id: String(member.id), label: member.name }))),
      this.createInput('Start', 'startTime', model.form.startTime, 'time'),
      this.createInput('End', 'endTime', model.form.endTime, 'time'),
      this.createSelect('Type', 'type', model.form.type, model.typeOptions),
      this.createSelect('Status', 'status', model.form.status, model.statusOptions),
    );

    const actions = document.createElement('div');
    actions.className = 'event-scheduler-shift-week-dialog__actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'event-scheduler-shift-week-dialog__cancel';
    cancel.dataset.schedulerDialogClose = '';
    cancel.textContent = 'Cancel';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'event-scheduler-shift-week-dialog__submit';
    submit.textContent = 'Create event';
    actions.append(cancel, submit);
    form.append(header, body, actions);
    this.append(form);
  }

  private createInput(label: string, name: string, value: string, type: string, wide = false): HTMLLabelElement {
    const field = this.createField(label, wide);
    const input = document.createElement('input');
    input.name = name;
    input.type = type;
    input.value = value;
    if (type === 'time') input.step = '1800';
    field.append(input);
    return field;
  }

  private createSelect(label: string, name: string, value: string, options: readonly SchedulerDialogOption[]): HTMLLabelElement {
    const field = this.createField(label);
    const select = document.createElement('select');
    select.name = name;
    select.append(...options.map((option) => {
      const item = document.createElement('option');
      item.value = option.id;
      item.textContent = option.label;
      return item;
    }));
    select.value = value;
    field.append(select);
    return field;
  }

  private createField(label: string, wide = false): HTMLLabelElement {
    const field = document.createElement('label');
    field.className = [
      'event-scheduler-shift-week-dialog__field',
      wide ? 'event-scheduler-shift-week-dialog__field--wide' : '',
    ].filter(Boolean).join(' ');
    const caption = document.createElement('span');
    caption.textContent = label;
    field.append(caption);
    return field;
  }

  private readonly handleClick = (event: Event): void => {
    if ((event.target as HTMLElement).closest('[data-scheduler-dialog-close]')) {
      this.dispatchEvent(new CustomEvent('scheduler-dialog-close', { bubbles: true, composed: true }));
    }
  };

  private readonly handleSubmit = (event: Event): void => {
    const formElement = event.target as HTMLFormElement;
    if (!formElement.matches('[data-scheduler-dialog-form]') || !this.currentModel) return;
    event.preventDefault();
    const data = new FormData(formElement);
    const fallback = this.currentModel.form;
    const form: ShiftWeekNewEventForm = {
      title: String(data.get('title') ?? fallback.title),
      date: String(data.get('date') ?? fallback.date),
      startTime: String(data.get('startTime') ?? fallback.startTime),
      endTime: String(data.get('endTime') ?? fallback.endTime),
      resourceId: String(data.get('resourceId') ?? fallback.resourceId),
      type: String(data.get('type') ?? fallback.type) as ShiftWeekNewEventForm['type'],
      status: String(data.get('status') ?? fallback.status) as ShiftWeekNewEventForm['status'],
    };
    this.dispatchEvent(new CustomEvent<SchedulerDialogSubmitDetail>('scheduler-dialog-submit', {
      bubbles: true,
      composed: true,
      detail: { form },
    }));
  };

  private modelsEqual(left: SchedulerDialogModel | null, right: SchedulerDialogModel | null): boolean {
    if (left === right) return true;
    if (!left || !right) return false;
    return left.form === right.form
      && left.teamMembers === right.teamMembers
      && left.typeOptions === right.typeOptions
      && left.statusOptions === right.statusOptions;
  }
}

export function defineSchedulerDialog(): void {
  if (!customElements.get(SCHEDULER_DIALOG_TAG)) {
    customElements.define(SCHEDULER_DIALOG_TAG, SchedulerDialogElement);
  }
}
