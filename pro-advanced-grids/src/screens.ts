import { mountScreen, type Example } from './shared/workbench-ui';

type Cleanup = () => void;
type Loader = () => Promise<(host: HTMLElement) => Cleanup | undefined>;

function lazyScreen(id: string, title: string, load: Loader) {
  return {
    id,
    title,
    mount(host: HTMLElement): Cleanup {
      let disposed = false;
      let cleanup: Cleanup | undefined;
      void load().then(mount => {
        if (!disposed) cleanup = mount(host);
      }).catch(error => {
        if (!disposed) console.error(`Could not load example ${id}`, error);
      });
      return () => {
        disposed = true;
        cleanup?.();
      };
    },
  };
}

function screen(loader: () => Promise<Example>): Loader {
  return async () => {
    const example = await loader();
    return host => mountScreen(host, example);
  };
}

// Each scenario is loaded on demand; the grid renderer and controls are shared.
export const examples = [
  lazyScreen('campaign-performance', 'Marketing Campaign Analytics', screen(() => import('./examples/campaigns/campaigns').then(m => m.campaigns))),
  lazyScreen('product-kpis', 'Product Sales & Profitability', screen(() => import('./examples/products/products').then(m => m.productKpis))),
  lazyScreen('service-visits', 'Field Service Visit Planner', screen(() => import('./examples/visits/visits').then(m => m.visitPlanner))),
  lazyScreen('category-forecast', 'Retail Demand Forecast', () => import('../../pro-category-forecast/src/forecast').then(m => m.mountForecast)),
  lazyScreen('job-schedule', 'Venue Changeover Schedule', screen(() => import('./examples/job-schedule/job-schedule').then(m => m.jobSchedule))),
  lazyScreen('supplier-quality', 'Supplier Quality Dashboard', screen(() => import('./examples/supplier-quality/supplier-quality').then(m => m.supplierQuality))),
  lazyScreen('reliability-index', 'Service Reliability Dashboard', screen(() => import('./examples/reliability-index/reliability-index').then(m => m.reliabilityIndex))),
  lazyScreen('scale-up-index', 'Company Growth Explorer', screen(() => import('./examples/scale-ups/scale-ups').then(m => m.scaleUpIndex))),
  lazyScreen('sales-to-target', 'Store Sales vs. Targets', screen(() => import('./examples/sales-targets/sales-targets').then(m => m.salesTargets))),
  lazyScreen('brand-scorecard', 'Brand Portfolio Scorecard', screen(() => import('./examples/brands/brands').then(m => m.brandScorecard))),
  lazyScreen('project-budget', 'Project Budget Tracker', screen(() => import('./examples/budget/budget').then(m => m.projectBudget))),
  lazyScreen('patient-cohorts', 'Patient Access Cohorts', screen(() => import('./examples/patient-cohorts/patient-cohorts').then(m => m.patientCohorts))),
];
