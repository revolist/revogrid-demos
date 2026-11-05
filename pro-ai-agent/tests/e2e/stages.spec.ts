import { expect, test, type Frame } from '@playwright/test';

for (const framework of ['ts', 'vue', 'react', 'angular']) {
  test(`AI assistant editing and formulas work in ${framework}`, async ({
    page,
  }) => {
    await page.route(/cookieyes\.com/, (route) => route.abort());
    await page.route('**/api/ai-view/interpret', (route) =>
      route.fulfill({ status: 503, body: '' }),
    );
    await page.goto(
      `/?framework=${framework}`,
      { waitUntil: 'domcontentloaded' },
    );
    let demo: Frame | undefined;
    await expect
      .poll(
        async () => {
          demo = page
            .frames()
            .find((frame) => frame.url().includes('angular-preview'));
          for (const frame of page.frames()) {
            if (
              await frame
                .getByRole('button', {
                  name: 'Show orders above 1000',
                  exact: true,
                })
                .count()
            ) {
              demo = frame;
              return true;
            }
          }
          return false;
        },
        { timeout: 60000 },
      )
      .toBe(true);
    await expect(
      demo!.getByRole('radiogroup', { name: 'AI demo stages' }),
    ).toHaveCount(0);
    const suggestions = demo!.getByRole('group', {
      name: 'Suggested requests',
    });
    await expect(suggestions.getByRole('button')).toHaveCount(3);
    const examples = suggestions.getByRole('combobox', { name: 'More' });
    await examples.click();
    await expect(
      demo!.getByRole('option', {
        name: 'Exclude cancelled orders',
        exact: true,
      }),
    ).toBeVisible();
    await examples.press('Escape');
    await expect(examples).toHaveAttribute('aria-expanded', 'false');
    const emptyChat = demo!.locator('.rv-ai-chat-empty');
    await expect(emptyChat).toBeVisible();
    await expect(emptyChat).toContainText('What would you like to do?');
    await expect(emptyChat.locator('strong')).toHaveCSS('font-size', '16px');
    const emptyViewport = demo!.getByRole('log', {
      name: 'Conversation messages',
    });
    await expect
      .poll(() =>
        emptyViewport.evaluate(
          (element) => element.scrollHeight - element.clientHeight,
        ),
      )
      .toBeLessThanOrEqual(1);
    const prompt = demo!.getByLabel('Ask AI to change this view');
    const sidebar = demo!.getByRole('complementary', {
      name: 'AI assistant',
      exact: true,
    });
    await expect(sidebar).toBeVisible();
    let gridBox = (await demo!.locator('.ai-view-demo__grid').boundingBox())!;
    let sidebarBox = (await sidebar.boundingBox())!;
    const divider = demo!.getByRole('separator', {
      name: 'Chat sidebar width',
    });
    await expect(divider).toBeVisible();
    await divider.focus();
    await divider.press('ArrowLeft');
    await expect
      .poll(async () => Math.round((await sidebar.boundingBox())!.width))
      .toBe(Math.round(sidebarBox.width) + 10);
    const dividerBox = (await divider.boundingBox())!;
    const beforeDrag = (await sidebar.boundingBox())!.width;
    await page.mouse.move(
      dividerBox.x + dividerBox.width / 2,
      dividerBox.y + dividerBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      dividerBox.x + dividerBox.width / 2 - 40,
      dividerBox.y + dividerBox.height / 2,
      { steps: 4 },
    );
    await page.mouse.up();
    await expect
      .poll(async () => Math.round((await sidebar.boundingBox())!.width))
      .toBe(Math.round(beforeDrag) + 40);
    gridBox = (await demo!.locator('.ai-view-demo__grid').boundingBox())!;
    sidebarBox = (await sidebar.boundingBox())!;
    const toolbar = demo!.getByRole('toolbar', { name: 'Grid controls' });
    await expect(
      toolbar.getByRole('button', {
        name: 'Restore previous view',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole('button', {
        name: 'Restore previous view',
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      demo!.getByRole('button', { name: 'Clear chat', exact: true }),
    ).toHaveCount(0);
    const composerBox = (await sidebar
      .locator('.rv-ai-chat-composer')
      .boundingBox())!;
    expect(composerBox.y).toBeGreaterThan(sidebarBox.y + sidebarBox.height / 2);
    expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(
      sidebarBox.y + sidebarBox.height,
    );

    expect(sidebarBox.x).toBeGreaterThanOrEqual(gridBox.x + gridBox.width - 1);
    expect(Math.abs(sidebarBox.y - gridBox.y)).toBeLessThan(2);
    expect(gridBox.height).toBeGreaterThan(400);
    await expect(
      sidebar.getByLabel('Ask AI to change this view'),
    ).toBeVisible();
    await expect(prompt).toHaveAttribute(
      'placeholder',
      'Describe what you want to do…',
    );
    await expect(demo!.locator('.rv-ai-prompt-hint')).toHaveCount(0);
    const composer = demo!.locator('.rv-ai-prompt-composer');
    await expect(composer).toHaveCSS('border-radius', '24px');
    const send = demo!.getByRole('button', { name: 'Send', exact: true });
    await expect(send).toHaveCSS('width', '30px');
    await expect(send).toHaveCSS('height', '30px');
    const inputBox = (await prompt.boundingBox())!;
    const sendBox = (await send.boundingBox())!;
    expect(sendBox.y).toBeLessThan(inputBox.y + inputBox.height);
    await demo!
      .locator('revogr-data[type="rgRow"] .rgCell[data-rgcol="2"]')
      .first()
      .click();
    await prompt.click();
    await prompt.pressSequentially('Draft request');
    await expect(prompt).toHaveValue('Draft request');
    await expect(prompt).toBeFocused();
    await expect(demo!.locator('revogr-edit input')).toHaveCount(0);
    await prompt.fill('');
    const submit = async (text: string) => {
      await prompt.fill(text);
      await prompt.press('Enter');
    };
    const preview = demo!.getByRole('region', {
      name: 'Review changes',
      exact: true,
    });
    const run = (name: string) =>
      demo!.getByRole('button', { name, exact: true }).click();
    const apply = async () => {
      await run('Apply changes');
      await expect(preview).toHaveCount(0);
    };
    await submit('Update ORD-0001');
    await expect(emptyChat).toHaveCount(0);
    await expect(preview).toContainText('1250');
    await apply();
    await expect(
      demo!.locator('[data-rgcol="2"][data-rgrow="0"]'),
    ).toContainText('1250');
    await expect(
      sidebar.getByRole('log', { name: 'Conversation messages' }),
    ).toContainText('Updated 1 row.');
    await submit('Add Total column');
    await apply();
    await submit('Calculate ORD-0001 total');
    await apply();
    await expect(
      demo!.locator('[data-rgcol="4"][data-rgrow="0"]'),
    ).toContainText('1500');
    await submit('Show orders above 1000');
    await submit('Sort highest amount first');
    await demo!.getByRole('button', { name: '2 steps', exact: true }).click();
    await demo!
      .getByRole('button', {
        name: 'Remove request: Show orders above 1000',
        exact: true,
      })
      .click();
    await expect(demo!.locator('.rv-ai-message--system')).toHaveCount(1);
    await demo!
      .getByRole('button', {
        name: 'Remove request: Sort highest amount first',
        exact: true,
      })
      .click();
    await expect(demo!.locator('.rv-ai-message--system')).toHaveCount(1);
    await expect(demo!.locator('.rv-ai-message--system')).toHaveText(
      'Request removed. View updated.',
    );
    const europeTotal = await demo!
      .locator('.ai-view-demo__grid revo-grid')
      .evaluate(async (grid: HTMLRevoGridElement) =>
        (await grid.getVisibleSource())
          .filter((row) => row.region === 'Europe')
          .reduce((sum, row) => sum + Number(row.amount), 0),
      );
    await submit('Summarize amount by Region');
    const summaryTable = sidebar.getByRole('treegrid', {
      name: /Visible summary/,
    });
    await expect(summaryTable).toBeVisible();
    await expect(summaryTable.getByRole('columnheader')).toHaveText([
      'Region',
      'Amount (Sum)',
      'Records',
    ]);
    await expect(
      summaryTable.getByRole('row').filter({ hasText: 'Europe' }),
    ).toContainText(europeTotal.toLocaleString());
    await expect(
      sidebar.locator('.rv-ai-message--assistant').last().locator('pre'),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 600, height: 1000 });
    await expect
      .poll(async () => {
        const grid = (await demo!
          .locator('.ai-view-demo__grid')
          .boundingBox())!;
        const assistant = (await sidebar.boundingBox())!;
        return (
          assistant.y >= grid.y + grid.height - 1 &&
          Math.abs(assistant.x - grid.x) < 2
        );
      })
      .toBe(true);
    await expect(divider).toBeHidden();
    await expect(prompt).toBeVisible();
  });
}

test('AI demo discloses the visible Order column to the interpreter', async ({
  page,
}) => {
  let fields:
    | Array<{ field: string; label: string; description?: string }>
    | undefined;
  await page.route(/cookieyes\.com/, (route) => route.abort());
  let releaseResponse!: () => void;
  const responseReady = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route('**/api/ai-view/interpret', async (route) => {
    fields = route.request().postDataJSON().fields;
    await responseReady;
    await route.fulfill({
      json: { kind: 'answer', message: 'Order is available.' },
    });
  });
  await page.goto('/?framework=ts');
  const prompt = page.getByLabel('Ask AI to change this view');
  await prompt.fill('Which columns can I use?');
  await prompt.press('Enter');
  try {
    const icon = page.locator('.rv-ai-task-icon[data-status="running"]').last();
    await expect(icon).toBeVisible();
    const dimensions = await icon.evaluate((element) => {
      const ring = element.querySelector('.rv-spinner__ring')!;
      return {
        slot: element.getBoundingClientRect().width,
        ring: parseFloat(getComputedStyle(ring).width),
      };
    });
    expect(dimensions.ring).toBeLessThanOrEqual(dimensions.slot);
  } finally {
    releaseResponse();
  }
  await expect
    .poll(() => fields?.find((field) => field.field === 'id'))
    .toMatchObject({
      field: 'id',
      label: 'Order',
      description:
        'Stable order identifier. Read-only; cannot be changed or removed.',
    });
  await expect(
    page.getByRole('log', { name: 'Conversation messages' }),
  ).toContainText('Order is available.');
});

test('unavailable AI backend explains free-form requests and keeps suggestions working without URL flags', async ({
  page,
}) => {
  await page.route(/cookieyes\.com/, (route) => route.abort());
  await page.route('**/api/ai-view/interpret', (route) =>
    route.fulfill({ status: 503, body: '' }),
  );
  await page.goto('/?framework=ts');
  const prompt = page.getByLabel('Ask AI to change this view');
  await prompt.fill('Please find orders shipping next week');
  await prompt.press('Enter');
  await expect(
    page.getByRole('log', { name: 'Conversation messages' }),
  ).toContainText('AI backend is unavailable');
  await page
    .getByRole('button', { name: 'Show orders above 1000', exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator('.ai-view-demo__grid revo-grid').evaluate(async (grid: HTMLRevoGridElement) => {
        const rows = await grid.getVisibleSource();
        return (
          rows.length > 0 && rows.every((row) => Number(row.amount) > 1000)
        );
      }),
    )
    .toBe(true);
});
