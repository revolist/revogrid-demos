import { demoColors } from '../../composables/demo-colors';
import { createMetricTileElement, releaseMetricElement } from '@revolist/ui/native';
import { createDottedComparisonElement, createStackedDotPlotElement, releaseSummaryChartElement } from '@revolist/revogrid-pro';
import '@revolist/ui/metric-panel.scss';
import '@revolist/revogrid-pro/styles.css';
import { attainment, months, sum, type Line, type Reading } from './forecast-data';
import { money, percent, signedPrecise, type ForecastText } from './forecast-columns';
import { distributionPoints } from './forecast-distribution';

/** Release UI-owned chart and metric mounts before replacing the summary. */
export function releaseSummary(host: HTMLElement) {
  host.querySelectorAll<HTMLElement>('.rv-metric-tile--summary').forEach(releaseMetricElement);
  host.querySelectorAll('.rv-dotted-comparison, .rv-stacked-dot-plot').forEach(releaseSummaryChartElement);
}

export function renderSummary(host: HTMLElement, reading: Reading, closeMonth: number, lines: readonly { line: Line; reading: Reading }[], text: ForecastText) {
  const ratios = lines.map(({ reading }) => reading.outlook / reading.plan);
  const document = host.ownerDocument;
  const maximum = Math.max(1, ...reading.months, ...reading.prior);
  const fullMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const makeGroup = (label: string, total: number, note: string, span: number, offset: number, kind: 'actual' | 'projected') => {
    const group = document.createElement('div');
    group.className = `summary-group summary-group--${kind}`;
    const seriesColor = kind === 'actual' ? demoColors.purple : demoColors.purpleLight;
    group.style.setProperty('--rv-dotted-accent', seriesColor);
    group.style.setProperty('--rv-dotted-marker', '#737373');
    group.style.width = `${span * 54}px`;
    group.append(createMetricTileElement(document, {
      label, value: money.format(total), detail: note,
      summary: { markerColor: seriesColor, ...(kind === 'actual' ? { legend: '━ FY25' } : {}) },
    }), createDottedComparisonElement(document, {
      label, values: reading.months.slice(offset, offset + span), references: reading.prior.slice(offset, offset + span), maximum, columnWidth: 54,
      tooltip: (value, reference, index) => ({
        title: `${months[offset + index]} ${offset + index < 2 ? 2025 : 2026}, every line in view`,
        subtitle: kind === 'actual' ? 'Actual' : 'Forecast',
        rows: [
          { label: 'FY26', value: fullMoney.format(value) },
          { label: 'FY25', value: reference === undefined ? '–' : fullMoney.format(reference) },
          { label: 'vs last year', value: reference ? signedPrecise.format(value / reference - 1) : '–' },
        ],
      }),
    }));
    return group;
  };
  const actualPrior = sum(reading.prior.slice(0, closeMonth + 1));
  const projectedPrior = sum(reading.prior.slice(closeMonth + 1));
  const actual = makeGroup(`Actual to ${months[closeMonth]}`, reading.actual, actualPrior ? `${signedPrecise.format(reading.actual / actualPrior - 1)} on FY25` : '–', closeMonth + 1, 0, 'actual');
  const outlook = document.createElement('div'); outlook.className = 'summary-group summary-group--outlook';
  const ratio = attainment(reading);
  outlook.append(createMetricTileElement(document, {
    label: 'Outlook vs Plan', value: ratio === null ? 'No plan' : percent.format(ratio), detail: ratio === null ? '' : signedPrecise.format(ratio - 1),
    summary: { markerColor: demoColors.blue, detailColor: '#005ea8' },
  }), createStackedDotPlotElement(document, {
    label: `${ratios.filter(value => value >= 1).length} of ${ratios.length} lines on plan`, reference: 78,
    tooltip: { title: 'Outlook vs Plan', subtitle: 'Every line in view', rows: [
      { label: 'Planned outlook', value: fullMoney.format(reading.plannedOutlook) },
      { label: 'Plan', value: fullMoney.format(reading.plan) },
      { label: 'On plan', value: `${ratios.filter(value => value >= 1).length} of ${ratios.length}` },
    ] },
    pointTooltip: (_point, index) => ({
      title: lines[index].line.name,
      subtitle: lines[index].line.department,
      rows: [
        { label: text.pointOutlook, value: fullMoney.format(lines[index].reading.outlook) },
        { label: text.pointPlan, value: fullMoney.format(lines[index].reading.plan) },
        { label: text.pointAttainment, value: percent.format(ratios[index]) },
      ],
    }),
    points: distributionPoints(ratios).map(({ x, y, onPlan }) => ({ x, y, tone: onPlan ? 'secondary' : 'primary' })),
  }));
  const end = document.createElement('div'); end.className = 'summary-end';
  releaseSummary(host);
  host.replaceChildren(actual);
  if (closeMonth < 11) host.append(makeGroup(`Forecast ${months[closeMonth + 1]} to Oct`, reading.forecast, projectedPrior ? `${signedPrecise.format(reading.forecast / projectedPrior - 1)} on FY25` : '–', 11 - closeMonth, closeMonth + 1, 'projected'));
  host.append(outlook, end);
}
