import { mountForecast } from '../../pro-category-forecast/src/forecast';
import { brandScorecard } from './examples/brands/brands';
import { projectBudget } from './examples/budget/budget';
import { campaigns } from './examples/campaigns/campaigns';
import { patientCohorts } from './examples/patient-cohorts/patient-cohorts';
import { productKpis } from './examples/products/products';
import { salesTargets } from './examples/sales-targets/sales-targets';
import { scaleUpIndex } from './examples/scale-ups/scale-ups';
import { visitPlanner } from './examples/visits/visits';
import { jobSchedule } from './examples/job-schedule/job-schedule';
import { supplierQuality } from './examples/supplier-quality/supplier-quality';
import { reliabilityIndex } from './examples/reliability-index/reliability-index';
import { mountScreen } from './shared/workbench-ui';

const screenExamples = [
  campaigns,
  productKpis,
  visitPlanner,
  jobSchedule,
  supplierQuality,
  reliabilityIndex,
  scaleUpIndex,
  salesTargets,
  brandScorecard,
  projectBudget,
  patientCohorts,
];

// All framework wrappers use this shared navigation and lifecycle.
export const examples = screenExamples.map((example) => ({
  id: example.id,
  title: example.title,
  mount: (host: HTMLElement) => mountScreen(host, example),
}));
examples.splice(3, 0, {
  id: 'category-forecast',
  title: 'Retail Demand Forecast',
  mount: mountForecast,
});
