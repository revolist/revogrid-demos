/** Shared task icons used by the reusable showcase column presets. */
import bugIcon from '@fortawesome/fontawesome-free/svgs/solid/bug.svg?raw';
import chartLineIcon from '@fortawesome/fontawesome-free/svgs/solid/chart-line.svg?raw';
import clipboardListIcon from '@fortawesome/fontawesome-free/svgs/solid/clipboard-list.svg?raw';
import codeIcon from '@fortawesome/fontawesome-free/svgs/solid/code.svg?raw';
import codeBranchIcon from '@fortawesome/fontawesome-free/svgs/solid/code-branch.svg?raw';
import desktopIcon from '@fortawesome/fontawesome-free/svgs/solid/desktop.svg?raw';
import diagramProjectIcon from '@fortawesome/fontawesome-free/svgs/solid/diagram-project.svg?raw';
import flagCheckeredIcon from '@fortawesome/fontawesome-free/svgs/solid/flag-checkered.svg?raw';
import gearsIcon from '@fortawesome/fontawesome-free/svgs/solid/gears.svg?raw';
import laptopCodeIcon from '@fortawesome/fontawesome-free/svgs/solid/laptop-code.svg?raw';
import listCheckIcon from '@fortawesome/fontawesome-free/svgs/solid/list-check.svg?raw';
import magnifyingGlassChartIcon from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass-chart.svg?raw';
import paletteIcon from '@fortawesome/fontawesome-free/svgs/solid/palette.svg?raw';
import roadCircleCheckIcon from '@fortawesome/fontawesome-free/svgs/solid/road-circle-check.svg?raw';
import rocketIcon from '@fortawesome/fontawesome-free/svgs/solid/rocket.svg?raw';
import serverIcon from '@fortawesome/fontawesome-free/svgs/solid/server.svg?raw';
import shieldHalvedIcon from '@fortawesome/fontawesome-free/svgs/solid/shield-halved.svg?raw';

const SHOWCASE_TASK_ICONS: Record<string, string> = {
  launch: roadCircleCheckIcon,
  backend: serverIcon,
  design: paletteIcon,
  frontend: laptopCodeIcon,
  devops: gearsIcon,
  iac: codeIcon,
  'ci-cd': codeBranchIcon,
  monitoring: chartLineIcon,
  'prod-deploy': rocketIcon,
  qa: listCheckIcon,
  'test-plan': clipboardListIcon,
  'unit-tests': bugIcon,
  'integration-tests': desktopIcon,
  uat: magnifyingGlassChartIcon,
  security: shieldHalvedIcon,
  pentest: bugIcon,
  audit: clipboardListIcon,
  'public-launch': flagCheckeredIcon,
};

function svgWithCurrentColor(svg: string) {
  return svg.replace('<svg ', '<svg fill="currentColor" ');
}

export function getShowcaseTaskIcon(taskId: unknown, tag: unknown): string {
  const taskKey = typeof taskId === 'string' ? taskId : '';
  const tagKey = typeof tag === 'string' ? tag.toLowerCase() : '';
  return svgWithCurrentColor(SHOWCASE_TASK_ICONS[taskKey] ?? SHOWCASE_TASK_ICONS[tagKey] ?? roadCircleCheckIcon);
}
