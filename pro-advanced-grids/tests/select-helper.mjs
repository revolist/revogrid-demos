/** Choose an option from a shared dropdown or a remaining native field. */
export async function chooseSelect(locator, value) {
  if (await locator.evaluate(element => element.tagName === 'SELECT')) {
    await locator.selectOption(value);
    return;
  }
  await locator.click();
  const page = locator.page();
  const option = typeof value === 'string'
    ? page.locator(`[role="option"][data-value=${JSON.stringify(value)}]:visible`)
    : page.getByRole('option', { name: value.label, exact: true });
  await option.first().click();
}
export async function selectValue(locator) {
  if (await locator.evaluate(element => element.tagName === 'SELECT')) return locator.inputValue();
  return locator.getAttribute('data-value');
}
