/** Shared title and subtitle structure for the standalone demo shells. */
export function createDemoHeading(
  document: Document,
  titleText: string,
  headingClass: string,
  subtitleText = '',
  subtitleClass = '',
) {
  const heading = document.createElement('header');
  heading.className = `demo-shell__heading ${headingClass}`;
  const identity = document.createElement('div');
  const title = document.createElement('h1');
  title.textContent = titleText;
  const subtitle = document.createElement('p');
  subtitle.textContent = subtitleText;
  if (subtitleClass) subtitle.className = subtitleClass;
  identity.append(title, subtitle);
  heading.append(identity);
  return { heading, subtitle };
}

/** Frame demo content independently from its borderless heading. */
export function createDemoBody(document: Document, ...children: Node[]) {
  const body = document.createElement('div');
  body.className = 'demo-shell__body';
  body.append(...children);
  return body;
}

/** Use the same accessible, compact creation action in each demo heading. */
export function configureDemoAddButton(button: HTMLButtonElement, label: string, plusIcon: string) {
  button.classList.add('demo-shell__add');
  button.setAttribute('aria-label', label);
  button.removeAttribute('data-icon');
  button.innerHTML = plusIcon;
  button.querySelector('svg')?.setAttribute('aria-hidden', 'true');
}
