import { expect, test } from '@playwright/test';

test('drills from company master into Gantt, Look-Ahead, and the resource Scheduler', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const shell = page.locator('.construction-fabrication');
  const commandDeck = page.locator('.construction-fabrication__command-deck');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  const expectFullHeight = async () => {
    const dimensions = await shell.evaluate((element) => {
      const shellRect = element.getBoundingClientRect();
      const gridRect = element.querySelector('revo-grid')!.getBoundingClientRect();
      return {
        shellBottomGap: Math.round(window.innerHeight - shellRect.bottom),
        gridBottomGap: Math.round(shellRect.bottom - gridRect.bottom),
        gridHeight: Math.round(gridRect.height),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        overflowY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      };
    });
    expect(dimensions.shellBottomGap).toBeLessThanOrEqual(13);
    expect(dimensions.gridBottomGap).toBeLessThanOrEqual(2);
    expect(dimensions.gridHeight).toBeGreaterThan(500);
    expect(dimensions.overflowX).toBe(0);
    expect(dimensions.overflowY).toBe(0);
  };
  const expectHeadersFit = async () => {
    const clipped = await page.locator('revo-grid .rgHeaderCell .header-content').evaluateAll((labels) => labels
      .filter((label) => {
        const text = label.textContent?.trim() ?? '';
        return text.length > 0 && text.length < 50;
      })
      .filter((label) => label.scrollWidth > label.clientWidth)
      .map((label) => label.textContent!.trim()));
    expect(clipped).toEqual([]);
  };
  const expectDatesFit = async () => {
    const clipped = await page.locator('revo-grid [role="gridcell"]').evaluateAll((cells) => cells
      .filter((cell) => /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(cell.textContent?.trim() ?? ''))
      .filter((cell) => cell.scrollWidth > cell.clientWidth)
      .map((cell) => cell.textContent!.trim()));
    expect(clipped).toEqual([]);
  };
  const expectActivityHeaderCentered = async () => {
    const midpointDelta = await page.getByRole('columnheader', { name: 'Activity', exact: true }).evaluate((header) => {
      const content = header.querySelector<HTMLElement>('.header-content')!;
      const textRange = document.createRange();
      textRange.selectNodeContents(content);
      const headerRect = header.getBoundingClientRect();
      const textRect = textRange.getBoundingClientRect();
      return {
        horizontal: Math.abs((headerRect.left + headerRect.width / 2) - (textRect.left + textRect.width / 2)),
        vertical: Math.abs((headerRect.top + headerRect.height / 2) - (textRect.top + textRect.height / 2)),
      };
    });
    expect(midpointDelta.horizontal).toBeLessThanOrEqual(1);
    expect(midpointDelta.vertical).toBeLessThanOrEqual(1);
  };
  await expectFullHeight();
  await expectHeadersFit();
  await expectDatesFit();
  await expect.poll(async () => page.locator('revo-grid').evaluate((element: any) => (
    element.filter?.selection?.syncCellTemplate
  ))).toEqual({
    departmentLabel: true,
    workArea: true,
    resourceName: true,
    status: true,
    statusIndicator: true,
    statusLabel: true,
    workflowStatus: true,
  });
  const masterDepartment = page.locator('.construction-fabrication__department').first();
  await expect(masterDepartment).toHaveText('Project');
  await expect(masterDepartment.locator('.construction-fabrication__department-dot')).toHaveCSS('background-color', 'rgb(148, 163, 184)');
  await page.getByRole('columnheader', { name: 'Department', exact: true }).getByRole('button').click();
  const departmentFilter = page.getByRole('dialog');
  await expect(departmentFilter.locator('.construction-fabrication__department')).toHaveCount(3);
  await expect(departmentFilter.locator('.construction-fabrication__department-label')).toHaveText([
    'Project',
    'Fabrication',
    'Installation',
  ]);
  await departmentFilter.getByRole('button', { name: 'Close filter', exact: true }).click();
  await page.getByRole('columnheader', { name: 'Progress', exact: true }).getByRole('button').click();
  const progressFilter = page.getByRole('dialog');
  await expect(progressFilter.getByRole('slider')).toHaveCount(2);
  await expect(progressFilter.getByRole('option', { name: 'slider', exact: true })).toHaveCount(1);
  await progressFilter.getByRole('button', { name: 'Close filter', exact: true }).click();
  await expect.poll(async () => page.locator('revo-grid').evaluate((element: any) => element.source?.filter((row: any) => String(row.id).startsWith('project:')).length)).toBe(3);
  await expect.poll(async () => page.locator('revo-grid').evaluate((element: any) => element.source?.some((row: any) => row.source === 'lookahead'))).toBe(false);
  await expect.poll(async () => page.locator('revo-grid').evaluate((element: any) => ({
    readOnly: Boolean(element.gantt?.readOnly),
    deleteHidden: element.gantt?.contextMenu?.hidden?.delete,
    editor: element.ganttTaskEditorDialog,
  }))).toEqual({
    readOnly: false,
    deleteHidden: true,
    editor: { readOnly: false, menuItemName: 'Edit…' },
  });
  await expect.poll(async () => page.locator('revo-grid').evaluate((element: any) => {
    const project = element.source.find((row: any) => String(row.id).startsWith('project:'));
    const phase = element.source.find((row: any) => row.parentId === project.id);
    const hidden = element.gantt.contextMenu.hidden;
    const cannotOutdent = new CustomEvent('gantt-before-task-change', {
      cancelable: true,
      detail: { action: 'outdent', taskId: phase.id },
    });
    return {
      indentProjectHidden: hidden.indent({ taskIds: [project.id], tasks: [project] }),
      indentPhaseHidden: hidden.indent({ taskIds: [phase.id], tasks: [phase] }),
      outdentPhaseHidden: hidden.outdent({ taskIds: [phase.id], tasks: [phase] }),
      outdentBlocked: !element.dispatchEvent(cannotOutdent),
    };
  })).toEqual({ indentProjectHidden: true, indentPhaseHidden: true, outdentPhaseHidden: true, outdentBlocked: true });
  await expect(page.locator('.rowHeaders .rgCell.row-header-drag-surface')).toHaveCount(0);
  const masterGrid = page.locator('revo-grid');
  await masterGrid.evaluate((element) => element.dispatchEvent(new CustomEvent('gantt-task-edit', {
    detail: { taskId: 'project:2814' },
  })));
  const projectEditor = page.locator('.gantt-task-editor-dialog');
  await expect(projectEditor).toBeVisible();
  await expect(projectEditor.locator('.gantt-task-editor-field--color')).toHaveCount(0);
  await projectEditor.locator('.gantt-task-editor-field--text input').first().fill('Civic Health Precinct — revised');
  await projectEditor.locator('button[type="submit"]').click();
  await expect(projectEditor).toBeHidden();
  await expect.poll(async () => masterGrid.evaluate((element: any) => (
    element.source?.find((row: any) => row.id === 'project:2814')?.name
  ))).toBe('Civic Health Precinct — revised');
  await page.getByLabel('Task table horizontal scroll').evaluate((element) => {
    element.scrollLeft = 0;
    element.dispatchEvent(new Event('scroll'));
  });
  const riverbankProjectLink = page.locator('.construction-fabrication__project-link', {
    hasText: 'Riverbank Apartments',
  });
  const riverbankCell = riverbankProjectLink.locator('xpath=ancestor::*[@role="gridcell"]');
  await expect(riverbankProjectLink).toHaveCSS('color', 'rgb(29, 78, 216)');
  await riverbankProjectLink.hover();
  await expect(riverbankProjectLink.locator('.construction-fabrication__project-name')).toHaveCSS('text-decoration-line', 'underline');
  await expect(riverbankCell.locator('[data-folder-state]')).toHaveAttribute('data-folder-state', 'closed');
  await riverbankCell.locator('.tree-toggle').click();
  await expect(riverbankCell.locator('[data-folder-state]')).toHaveAttribute('data-folder-state', 'open');
  await page.getByRole('button', { name: 'Riverbank Apartments', exact: true }).first().click();
  await expectFullHeight();
  await expectHeadersFit();
  await expectDatesFit();
  await expectActivityHeaderCentered();
  await expect(page.locator('.construction-fabrication__project-root').first()).toHaveCSS('color', 'rgb(15, 23, 42)');
  await expect(page.getByRole('button', { name: 'Days', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => page.locator('revo-grid').evaluate((element: any) => element.gantt?.zoomPreset)).toBe('day-week');
  await page.getByLabel('Task table horizontal scroll').evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event('scroll'));
  });
  await page.getByRole('columnheader', { name: 'Resource', exact: true }).getByRole('button').click();
  const resourceFilter = page.getByRole('dialog');
  await expect(resourceFilter.getByText('Install Crew A', { exact: true })).toBeVisible();
  await resourceFilter.getByRole('button', { name: 'Close filter', exact: true }).click();
  await page.getByLabel('Task table horizontal scroll').evaluate((element) => {
    element.scrollLeft = 0;
    element.dispatchEvent(new Event('scroll'));
  });
  await page.getByRole('columnheader', { name: 'Duration', exact: true }).getByRole('button').click();
  const durationFilter = page.getByRole('dialog');
  await expect.poll(async () => page.locator('revo-grid').evaluate((element: any) => {
    const column = element.columns?.find((item: any) => item.prop === 'duration');
    return column?.cellParser?.({ formattedDuration: '352 days', duration: 2_816 }, column);
  })).toBe(352);
  await expect(durationFilter.getByRole('slider')).toHaveCount(2);
  await expect(durationFilter.getByText('Working duration (days)', { exact: true })).toBeVisible();
  await expect(durationFilter.locator('.range-values')).toContainText('days');
  await expect(durationFilter.locator('.range-values')).toContainText('352 days');
  await durationFilter.locator('.toSlider').evaluate((input: HTMLInputElement) => {
    input.value = '100';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(async () => page.locator('revo-grid').evaluate(async (element: any) => {
    const visibleRows = await element.getVisibleSource();
    return {
      designVisible: visibleRows.some((row: any) => row.name === 'Design'),
      fabricationVisible: visibleRows.some((row: any) => row.name === 'Fabrication'),
    };
  })).toEqual({ designVisible: true, fabricationVisible: false });
  await durationFilter.getByRole('button', { name: 'Close filter', exact: true }).click();
  const projectGrid = page.locator('revo-grid');
  await expect.poll(async () => projectGrid.evaluate((element: any) => (
    element.gantt?.contextMenu?.colorPalette
  ))).toBe(false);
  await expect.poll(async () => projectGrid.evaluate(async (element: any) => {
    const plugins = await element.getPlugins();
    const gantt = plugins.find((plugin: any) => typeof plugin.getProjectSnapshot === 'function');
    return gantt?.ganttConfig?.scrollToTaskOnCellClick ?? false;
  })).toBe(true);
  const timelineScroll = projectGrid.locator('revogr-viewport-scroll.colPinEnd');
  const readTimelineScroll = () => timelineScroll.evaluate((element) => element.scrollLeft);
  await timelineScroll.evaluate((element) => {
    element.scrollLeft = 0;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await expect.poll(readTimelineScroll).toBe(0);
  const closeoutTaskCell = projectGrid.locator(
    'revogr-viewport-scroll:not(.colPinEnd) revogr-data[type="rgRow"] .rgCell:visible',
  ).filter({ hasText: 'Closeout' }).first();
  await expect(closeoutTaskCell).toBeVisible();
  await closeoutTaskCell.click();
  await expect.poll(readTimelineScroll).toBeGreaterThan(0);
  await expect.poll(() => projectGrid.evaluate((element: any) => {
    const task = element.source?.find((row: any) => row.projectRef === '2801' && row.name === 'Closeout');
    const viewport = element.querySelector('revogr-viewport-scroll.colPinEnd');
    const bar = [...element.querySelectorAll('.gantt-bar')]
      .find((candidate: any) => candidate.dataset.ganttTaskId === task?.id);
    if (!(viewport instanceof HTMLElement) || !(bar instanceof HTMLElement)) return false;
    const viewportRect = viewport.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    return barRect.left >= viewportRect.left && barRect.right <= viewportRect.right;
  })).toBe(true);

  await projectGrid.evaluate((element) => element.dispatchEvent(new CustomEvent('gantt-task-edit', {
    detail: { taskId: 'task:2801:lookahead:3' },
  })));
  const editor = page.locator('.gantt-task-editor-dialog');
  await expect(editor).toBeVisible();
  await expect(editor.locator('.gantt-task-editor-field--color')).toHaveCount(0);
  await editor.locator('.gantt-task-editor-field--text input').first().fill('Install glass panels L1 East — revised');
  await editor.locator('button[type="submit"]').click();
  await expect(editor).toBeHidden();
  await expect.poll(async () => projectGrid.evaluate((element: any) => (
    element.source?.find((row: any) => row.id === 'task:2801:lookahead:3')?.name
  ))).toBe('Install glass panels L1 East — revised');

  await page.getByRole('button', { name: 'Resources', exact: true }).click();
  await expectFullHeight();
  await expectHeadersFit();
  await expect(commandDeck.getByText('Resource timeline', { exact: true })).toBeVisible();
  await expect(commandDeck.getByText('Move period', { exact: true })).toHaveCount(0);
  await expect(page.locator('.construction-fabrication__toolbar')).toHaveCount(0);
  for (const [name, title] of [
    ['Previous', 'Previous 14 days'],
    ['Reset', 'Reset to the featured window'],
    ['Next', 'Next 14 days'],
  ] as const) {
    const periodButton = commandDeck.getByRole('button', { name, exact: true });
    await expect(periodButton).toHaveAttribute('aria-label', name);
    await expect(periodButton).toHaveAttribute('title', title);
    await expect(periodButton.locator('svg')).toBeVisible();
    expect((await periodButton.textContent())?.trim()).toBe('');
  }
  const resourcePeriod = commandDeck.locator('.construction-fabrication__period');
  const initialResourcePeriod = await resourcePeriod.textContent();
  await commandDeck.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(resourcePeriod).not.toHaveText(initialResourcePeriod!);
  await commandDeck.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(resourcePeriod).toHaveText(initialResourcePeriod!);
  const scheduler = page.locator('revo-grid');
  const resourceHeader = page.getByRole('columnheader', { name: 'Resource', exact: true });
  const dayHeader = page.getByText('Mon 17', { exact: true }).first().locator('..');
  await expect(resourceHeader).toBeVisible();
  await expect(dayHeader).toHaveClass(/event-scheduler-timeline-header/);
  const headerSeparators = await Promise.all([resourceHeader, dayHeader].map((header) => header.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      width: style.borderBottomWidth,
      style: style.borderBottomStyle,
      color: style.borderBottomColor,
    };
  })));
  expect(headerSeparators.every((separator) => (
    separator.width === '1px'
    && separator.style === 'solid'
    && separator.color !== 'rgba(0, 0, 0, 0)'
  ))).toBe(true);
  await expect(page.getByText('Install Crew A', { exact: true }).first()).toBeVisible();
  await expect(page.locator('[data-event-id], .event-scheduler-event').first()).toBeVisible();
  await expect.poll(async () => scheduler.evaluate((element: any) =>
    element.eventScheduler?.customization?.conflicts?.appearance
  )).toBe('fill');
  await expect.poll(async () => scheduler.evaluate((element: any) =>
    element.eventScheduler?.resourceTimelineRowSizing
  )).toEqual({ enabled: true, minEventHeight: 24 });
  const filledConflict = scheduler.locator(
    '.event-scheduler-event.construction-fabrication__scheduler-conflict-fill',
  ).first();
  await expect(filledConflict).toBeVisible();
  const conflictVisual = await filledConflict.locator(
    '.event-scheduler-event__button',
  ).evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      background: style.backgroundColor,
      boxShadow: style.boxShadow,
    };
  });
  expect(conflictVisual.background).toBe('rgb(190, 91, 0)');
  expect(conflictVisual.boxShadow).not.toContain('0px 0px 0px 4px');

  const workshopBars = scheduler.locator(
    '.event-scheduler-event[data-event-scheduler-resource-id="resource:workshop-crew"]',
  );
  const managerBar = scheduler.locator(
    '.event-scheduler-event[data-event-scheduler-resource-id="resource:project-manager"]',
  ).first();
  await expect(workshopBars).toHaveCount(3);
  await expect(managerBar).toBeVisible();
  const adaptiveRows = await scheduler.evaluate((element) => {
    const denseBars = Array.from(element.querySelectorAll<HTMLElement>(
      '.event-scheduler-event[data-event-scheduler-resource-id="resource:workshop-crew"]',
    ));
    const sparseBar = element.querySelector<HTMLElement>(
      '.event-scheduler-event[data-event-scheduler-resource-id="resource:project-manager"]',
    )!;
    const denseRow = denseBars[0].closest<HTMLElement>('[role="row"]')!;
    const sparseRow = sparseBar.closest<HTMLElement>('[role="row"]')!;
    const denseRowRect = denseRow.getBoundingClientRect();
    const titleGeometry = denseBars.map((bar) => {
      const buttonRect = bar.querySelector<HTMLElement>(
        '.event-scheduler-event__button',
      )!.getBoundingClientRect();
      const titleRect = bar.querySelector<HTMLElement>(
        '.event-scheduler-event__title',
      )!.getBoundingClientRect();
      return {
        centerOffset: Math.abs(
          (titleRect.top + titleRect.bottom) / 2
            - (buttonRect.top + buttonRect.bottom) / 2,
        ),
        contained:
          titleRect.top >= buttonRect.top - 1
          && titleRect.bottom <= buttonRect.bottom + 1,
      };
    });
    return {
      denseRowHeight: denseRowRect.height,
      sparseRowHeight: sparseRow.getBoundingClientRect().height,
      barHeights: denseBars.map((bar) => bar.getBoundingClientRect().height),
      titleGeometry,
      barsContained: denseBars.every((bar) => {
        const rect = bar.getBoundingClientRect();
        return rect.top >= denseRowRect.top - 1 && rect.bottom <= denseRowRect.bottom + 1;
      }),
    };
  });
  expect(adaptiveRows.denseRowHeight).toBeGreaterThan(adaptiveRows.sparseRowHeight);
  expect(adaptiveRows.sparseRowHeight).toBeCloseTo(44, 0);
  expect(Math.min(...adaptiveRows.barHeights)).toBeGreaterThanOrEqual(24);
  expect(Math.max(...adaptiveRows.titleGeometry.map(({ centerOffset }) => centerOffset))).toBeLessThanOrEqual(1);
  expect(adaptiveRows.titleGeometry.every(({ contained }) => contained)).toBe(true);
  expect(adaptiveRows.barsContained).toBe(true);

  const multiDayBar = scheduler.locator(
    '.event-scheduler-event--horizontal[data-event-scheduler-to-next-day="true"]',
  ).first();
  await expect(multiDayBar).toBeVisible();
  const multiDayVisual = await multiDayBar.evaluate((element) => {
    const button = element.querySelector<HTMLElement>('.event-scheduler-event__button')!;
    const row = element.closest<HTMLElement>('[role="row"]') ?? element.parentElement!;
    const style = getComputedStyle(button);
    const barRect = element.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    return {
      borderTopStyle: style.borderTopStyle,
      borderBottomStyle: style.borderBottomStyle,
      borderTopLeftRadius: style.borderTopLeftRadius,
      borderBottomLeftRadius: style.borderBottomLeftRadius,
      containedInRow:
        barRect.top >= rowRect.top - 1 &&
        barRect.bottom <= rowRect.bottom + 1,
    };
  });
  expect(multiDayVisual.borderTopStyle).toBe('solid');
  expect(multiDayVisual.borderBottomStyle).toBe('solid');
  expect(Number.parseFloat(multiDayVisual.borderTopLeftRadius)).toBeGreaterThan(0);
  expect(Number.parseFloat(multiDayVisual.borderBottomLeftRadius)).toBeGreaterThan(0);
  expect(multiDayVisual.containedInRow).toBe(true);
  await scheduler.evaluate(async (element: any) => {
    const plugins = await element.getPlugins();
    const plugin = plugins.find((candidate: any) => typeof candidate.editEvent === 'function');
    plugin.editEvent('task:2801:lookahead:3', { endDateTime: '2026-09-04T00:00:00+10:00' });
  });
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect.poll(async () => page.locator('revo-grid').evaluate((element: any) => element.source?.find((row: any) => row.id === 'task:2801:lookahead:3')?.endDate)).toBe('2026-09-03');
  await expect(commandDeck.getByRole('button', { name: 'Days', exact: true })).toBeVisible();
  await expect(page.locator('.construction-fabrication__toolbar')).toHaveCount(0);
  const filterTrigger = commandDeck.getByRole('button', { name: 'Filter', exact: true });
  await filterTrigger.click();
  const projectFilters = page.getByRole('dialog', { name: 'Schedule filters' });
  await expect(projectFilters).toBeVisible();
  await expect(filterTrigger).toHaveAttribute('aria-expanded', 'true');
  await projectFilters.getByRole('button', { name: 'Fabrication', exact: true }).click();
  await expect(projectFilters).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(projectFilters).toBeHidden();
  await expect(filterTrigger).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: 'Look-Ahead', exact: true }).click();
  await expectFullHeight();
  await expectHeadersFit();
  await expectActivityHeaderCentered();
  await expectDatesFit();
  await expect(commandDeck.getByText('Active window', { exact: true })).toBeVisible();
  await expect(commandDeck.getByText('Move period', { exact: true })).toHaveCount(0);
  await expect(commandDeck.getByText('17 Aug 2026 – 30 Aug 2026', { exact: true })).toBeVisible();
  await expect(page.locator('.construction-fabrication__toolbar')).toHaveCount(0);
  await expect.poll(async () => page.locator('revo-grid').evaluate((element: any) => ({
    hasProject: element.source?.some((row: any) => String(row.id).startsWith('project:')),
    hasPhase: element.source?.some((row: any) => row.id === 'task:2801:20'),
    hasParent: element.source?.some((row: any) => row.id === 'task:2801:22'),
    hasChild: element.source?.some((row: any) => row.id === 'task:2801:lookahead:3'),
  }))).toEqual({ hasProject: false, hasPhase: false, hasParent: true, hasChild: true });
  await expect.poll(async () => page.locator('revo-grid').evaluate((element: any) => (
    element.columns?.find((column: any) => column.prop === 'name')?.pin
  ))).toBeUndefined();
  await page.getByRole('columnheader', { name: 'Work area', exact: true }).getByRole('button').click();
  const workAreaColumnFilter = page.getByRole('dialog');
  await expect(workAreaColumnFilter.getByText('Workshop', { exact: true })).toBeVisible();
  await workAreaColumnFilter.getByRole('button', { name: 'Close filter', exact: true }).click();
  await page.getByLabel('Task table horizontal scroll').evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event('scroll'));
  });
  await page.getByRole('columnheader', { name: 'Status', exact: true }).getByRole('button').click();
  const statusColumnFilter = page.getByRole('dialog');
  await expect(statusColumnFilter.locator('.construction-fabrication__status').first()).toBeVisible();
  await statusColumnFilter.getByRole('button', { name: 'Close filter', exact: true }).click();
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const lookAheadFilters = page.getByRole('dialog', { name: 'Schedule filters' });
  await expect(lookAheadFilters.getByRole('combobox', { name: 'Work area' })).toContainText('Workshop');
  await lookAheadFilters.getByRole('button', { name: 'Installation', exact: true }).click();
  await expect(lookAheadFilters.getByRole('button', { name: 'Installation', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const layout = await shell.evaluate((element) => ({
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    gridFits: (() => { const grid = element.querySelector('revo-grid')!.getBoundingClientRect(); const frame = element.getBoundingClientRect(); return grid.left >= frame.left && grid.right <= frame.right + 1; })(),
  }));
  expect(layout).toEqual({ overflowX: 0, gridFits: true });
  expect(errors).toEqual([]);
});

test('rolls a Look-Ahead child into Project Schedule without changing another project', async ({ page }) => {
  await page.goto('/');
  const grid = page.locator('revo-grid');
  await expect(grid).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Civic Health Precinct', exact: true }).first().click();
  const civicFabricationFinish = await grid.evaluate((element: any) => element.source
    .find((row: any) => row.projectRef === '2814' && row.name === 'Fabrication')?.endDate);
  expect(civicFabricationFinish).toBeTruthy();

  await page.getByRole('button', { name: 'Company Master', exact: true }).click();
  await page.getByRole('button', { name: 'Riverbank Apartments', exact: true }).first().click();
  await page.getByRole('button', { name: 'Look-Ahead', exact: true }).click();

  const changed = await grid.evaluate(async (element: any) => {
    const plugins = await element.getPlugins();
    const gantt = plugins.find((candidate: any) => (
      typeof candidate.updateTask === 'function'
      && typeof candidate.getProjectSnapshot === 'function'
    ));
    return gantt.updateTask('task:2801:lookahead:3', { endDate: '2026-10-02' });
  });
  expect(changed).toBe(true);
  await expect.poll(async () => grid.evaluate(async (element: any) => {
    const source = await element.getSource();
    return {
      childFinish: source.find((row: any) => row.id === 'task:2801:lookahead:3')?.endDate,
      parentFinish: source.find((row: any) => row.id === 'task:2801:22')?.endDate,
    };
  })).toEqual({ childFinish: '2026-10-02', parentFinish: '2026-10-02' });

  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect.poll(async () => grid.evaluate(async (element: any) => {
    const source = await element.getSource();
    return {
      childFinish: source.find((row: any) => row.id === 'task:2801:lookahead:3')?.endDate,
      parentFinish: source.find((row: any) => row.id === 'task:2801:22')?.endDate,
    };
  })).toEqual({ childFinish: '2026-10-02', parentFinish: '2026-10-02' });

  await page.getByRole('button', { name: 'Company Master', exact: true }).click();
  await page.getByRole('button', { name: 'Civic Health Precinct', exact: true }).first().click();
  await expect.poll(async () => grid.evaluate((element: any) => element.source
    .find((row: any) => row.projectRef === '2814' && row.name === 'Fabrication')?.endDate)).toBe(civicFabricationFinish);
});
