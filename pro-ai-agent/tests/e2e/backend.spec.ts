import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { createAiReferenceHandler } from '../../src/backend/src/handler';
import { scriptedAiViewInterpreter } from '../../src/AiAssistant.data';

for (const framework of ['ts', 'vue', 'react', 'angular']) {
  test(`connects the ${framework} demo to the backend without URL flags`, async ({
    page, baseURL,
  }) => {
    let requests = 0;
    const server = createServer(
      createAiReferenceHandler(
        async (request, context) => {
          requests++;
          if (request.answerOnly) expect(request.actions).toEqual([]);
          else
            expect(
              request.actions?.some((action) => action.name === 'cells.update'),
            ).toBe(true);
          if (requests === 2)
            expect(request.history?.[0]).toEqual({
              role: 'user',
              content: 'Which columns can I use?',
            });
          return scriptedAiViewInterpreter(request, context);
        },
        [new URL(baseURL!).origin],
        { mode: 'scripted' },
        undefined,
        ['grid.aggregate'],
      ),
    );
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const endpoint = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/ai-view/interpret`;
    try {
      // Isolate each run's backend while exercising the same-origin connection URL.
      await page.route('**/api/ai-view/interpret', async (route) => {
        await route.fulfill({ response: await route.fetch({ url: endpoint }) });
      });
      await page.goto(
        `/?framework=${framework}`,
      );
      let demo = page.mainFrame();
      await expect
        .poll(
          async () => {
            for (const frame of page.frames()) {
              if (
                await frame.getByLabel('Ask AI to change this view').count()
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
      const prompt = demo.getByLabel('Ask AI to change this view');
      await expect(
        demo.getByRole('log', { name: 'Conversation messages' }),
      ).toHaveCount(1);
      await prompt.fill('Which columns can I use?');
      await prompt.press('Enter');
      await expect(
        demo.locator('.rv-ai-message--assistant .rv-ai-message-content').last(),
      ).toContainText('Region, Amount and Status');
      await expect(
        demo.getByRole('button', { name: /^\d+ steps?$/ }),
      ).toHaveCount(0);
      await prompt.fill('Summarize amount by Region');
      await prompt.press('Enter');
      await expect(
        demo.getByRole('treegrid', { name: /Visible summary/ }),
      ).toBeVisible();
      await expect(
        demo.locator('.rv-ai-message--assistant .rv-ai-message-content').last(),
      ).toContainText('This describes the current visible view.');
      await prompt.fill('Update ORD-0001');
      await prompt.press('Enter');
      const preview = demo.getByRole('region', {
        name: 'Review changes',
        exact: true,
      });
      await expect(preview).toContainText('1250');
      expect(requests).toBe(4);
      const amount = demo.locator(
        '.ai-view-demo__grid revogr-data[type="rgRow"] [data-rgcol="2"][data-rgrow="0"]',
      );
      await expect(amount).toHaveText('100');
      await demo
        .getByRole('button', { name: 'Apply changes', exact: true })
        .click();
      await expect(amount).toHaveText('1250');
      await expect(demo.locator('.rv-ai-message--user').first()).toHaveText(
        'Which columns can I use?',
      );
      await expect(
        demo.getByRole('button', { name: 'Clear chat', exact: true }),
      ).toHaveCount(0);
      await expect(amount).toHaveText('1250');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
}
