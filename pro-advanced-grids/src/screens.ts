import { mountForecast } from '../../pro-category-forecast/src/forecast';
import { brandScorecard } from './brands';
import { projectBudget } from './budget';
import { campaigns } from './campaigns';
import { patientCohorts } from './patient-cohorts';
import { productKpis } from './products';
import { salesTargets } from './sales-targets';
import { scaleUpIndex } from './scale-ups';
import { visitPlanner } from './visits';
import { jobSchedule } from './job-schedule';
import { supplierQuality } from './supplier-quality';
import { reliabilityIndex } from './reliability-index';
import { mountScreen } from './workbench-ui';

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
