interface ButtonOptions {
  active?: boolean;
  icon?: string;
  iconOnly?: boolean;
  kind?: 'default' | 'quiet' | 'tab';
  title?: string;
}

export function createText(tag: string, className: string, value: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
}

export function createIcon(
  svg: string,
  className = 'construction-fabrication__icon',
): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = className;
  element.setAttribute('aria-hidden', 'true');
  element.innerHTML = svg;
  return element;
}

export function createButton(
  label: string,
  onClick: () => void,
  options: ButtonOptions = {},
): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `construction-fabrication__button construction-fabrication__button--${options.kind ?? 'default'}`;

  if (options.active !== undefined) {
    element.setAttribute('aria-pressed', String(options.active));
  }
  if (options.title) element.title = options.title;
  if (options.iconOnly) {
    element.classList.add('construction-fabrication__button--icon-only');
    element.setAttribute('aria-label', label);
  }
  if (options.icon) element.append(createIcon(options.icon));
  if (!options.iconOnly) element.append(document.createTextNode(label));

  element.addEventListener('click', onClick);
  return element;
}

export function createControlSet(items: HTMLElement[]): HTMLDivElement {
  const controls = document.createElement('div');
  controls.className = 'construction-fabrication__control-set';
  controls.append(...items);
  return controls;
}

export function createControlGroup(
  label: string,
  items: HTMLElement[],
  groupIcon?: string,
): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'construction-fabrication__control-group';

  const groupLabel = createText('span', 'construction-fabrication__toolbar-label', label);
  if (groupIcon) {
    groupLabel.prepend(createIcon(groupIcon, 'construction-fabrication__label-icon'));
  }

  group.append(groupLabel, createControlSet(items));
  return group;
}

export function displayDate(date: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}
