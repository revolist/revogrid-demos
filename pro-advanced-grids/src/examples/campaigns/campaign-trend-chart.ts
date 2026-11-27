import { demoColors } from '../../../../composables/demo-colors';
import { mountAreaChart } from '@revolist/ui/native';
import '@revolist/ui/styles/charts.scss';

export function campaignTrendChart(values: readonly number[], label: string, format: (value: number) => string) {
  const element = document.createElement('div');
  element.className = 'campaign-detail-chart';
  element.style.setProperty('--rv-distribution-accent', demoColors.purple);
  const plot = document.createElement('div');
  const chart = mountAreaChart(plot, {
    ariaLabel: label,
    data: values.map((value, index) => ({ key: String(index), value, tooltip: { title: `Day ${index + 1}: ${format(value)}` } })),
    height: 150,
    showGrid: true,
    showPoints: false,
    interpolation: 'smooth',
    tooltipIndicator: 'line',
  });
  const labels = document.createElement('div');
  labels.className = 'campaign-detail-chart__labels';
  for (const text of ['Sep 6', 'Sep 13', 'Sep 20', 'Sep 27', 'Oct 5']) {
    const item = document.createElement('span');
    item.textContent = text;
    labels.append(item);
  }
  element.append(plot, labels);
  return { element, destroy: chart.destroy };
}
