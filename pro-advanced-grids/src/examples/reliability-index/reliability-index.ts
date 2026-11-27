import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Legend, SegmentedSwitch } from '@revolist/ui/react';
import { badgeClassName, mountTabs } from '@revolist/ui/native';
import { demoColors } from '../../../../composables/demo-colors';
import { personPortrait } from '../../../../composables/demo-portraits';
import type { ColumnData, ColumnRegular, DataType } from "@revolist/revogrid";
import {
  renderCellAction,
  RowChartHoverPlugin,
  createCategoryRowHoverLink,
  entityCellRenderer,
  avatarRenderer,
  comparisonSparklineRenderer,
  visualCellRenderer,
} from "@revolist/revogrid-pro";
import {
  createChartHost,
} from "@revolist/charts/core";
import { createLollipopChart } from "@revolist/charts/lollipop";
import { createSparklineChart } from "@revolist/charts/sparkline";
import {
  button,
  deleteButton,
  field,
  input,
  make,
  matches,
  select,
  type Example,
} from "../../shared/workbench-ui";

type Slo = {
  id: string;
  name: string;
  service: string;
  team: string;
  objective: number;
  window: number;
  budget: number;
  days: number;
  alert: "Quiet" | "Paging" | "Ticket" | "Muted";
  kind: string;
  owner: string;
  trend: number[];
};
type ViewRow = Slo & {
  measured: number;
  ownerAvatar: string;
  status: "Exhausted" | "At Risk" | "Healthy";
};
// Fictional service-health snapshots: objective, window, remaining budget and estimated days.
const source: [string, string, string, number, number, number, number, Slo["alert"]][] = [
  ["Order journal durability", "order-journal", "Platform", 99.95, 28, -67.2, 0, "Paging"],
  ["Mobile alert delivery", "message-router", "Messaging", 99.9, 30, -42.8, 0, "Quiet"],
  ["Catalog search freshness", "catalog-indexer", "Search", 99.5, 7, -24.6, 0, "Ticket"],
  ["Settlement batch timeliness", "settlement-runner", "Payments", 99.9, 28, -12.7, 0, "Quiet"],
  ["Risk scoring latency", "risk-engine", "Risk", 99.95, 30, -3.8, 0, "Quiet"],
  ["Transaction journal freshness", "order-journal", "Platform", 99.9, 7, 5.6, 3, "Paging"],
  ["Settlement API availability", "settlement-runner", "Payments", 99.95, 30, 13.8, 6, "Quiet"],
  ["Checkout API latency", "checkout-gateway", "Payments", 99.5, 7, 21.4, 9, "Ticket"],
  ["Event delivery success", "event-relay", "Platform", 99.95, 30, 38.2, 18, "Quiet"],
  ["Settlement reconciliation", "settlement-reporter", "Platform", 99.5, 28, 44.1, 21, "Quiet"],
  ["Catalog query latency", "catalog-indexer", "Search", 99.9, 30, 48.6, 8, "Quiet"],
  ["Checkout gateway availability", "checkout-gateway", "Payments", 99.99, 28, 57.9, 32, "Quiet"],
  ["Event relay latency", "event-relay", "Platform", 99.5, 28, 63.4, 26, "Muted"],
  ["Mobile push latency", "message-router", "Messaging", 99.5, 30, 69.8, 41, "Quiet"],
  ["Settlement report freshness", "settlement-reporter", "Platform", 99.9, 7, 75.3, 38, "Muted"],
  ["Receipt email delivery", "message-router", "Messaging", 99.95, 30, 80.2, 87, "Quiet"],
  ["Returns API availability", "checkout-gateway", "Payments", 99.95, 7, 85.6, 123, "Quiet"],
  ["Risk model availability", "risk-engine", "Risk", 99.99, 30, 94.1, 192, "Quiet"],
];
const rows: Slo[] = source.map(
  ([name, service, team, objective, window, budget, days, alert], id) => ({
    id: `slo-${id}`,
    name, service, team, objective, window, budget, days, alert,
    kind: name.toLowerCase().includes("latency") ? "Latency" : "Availability",
    owner: ["Rina Patel", "Milo Chen", "Sofia Reyes", "Avery Brooks"][id % 4],
    // A stepped workload profile and occasional incident provide varied fictional histories.
    trend: Array.from({ length: 30 }, (_, day) => {
      const openingBudget = 62 + (id % 5) * 5;
      const baseline = openingBudget + (budget - openingBudget) * day / 29;
      const variation = day === 29 ? 0 : ((day * 11 + id * 7) % 9 - 4) * 0.45;
      const incident = day === 9 + (id * 3) % 17 ? 9 + (id % 4) * 3 : 0;
      return baseline + variation - incident;
    }),
  }),
);
const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
const level = (budget: number): ViewRow["status"] =>
  budget < 0 ? "Exhausted" : budget < 25 ? "At Risk" : "Healthy";

export const reliabilityIndex: Example = {
  id: "reliability-index",
  title: "Service Reliability Dashboard",
  description: "18 SLOs • 5 exhausted • 2 paging",
  setup(bench) {
    const data = structuredClone(rows);
    let tab: "All" | ViewRow["status"] = "All";
    let sort: "triage" | "budget" | "name" | "days" | "alert" = "triage";
    let ascending = true;
    let selectedId = "";
    let chartView: "History" | "Compare" = "Compare";
    let disposed = false;
    let activeChart:
      | Awaited<ReturnType<typeof createLollipopChart>>
      | undefined;
    let chartGeneration = 0;
    const scope = select(
      "Measure at objective",
      ["Own objective", "99%", "99.5%", "99.9%", "99.95%", "99.99%"],
      "Own objective",
      refresh,
    );
    const team = select(
      "Team",
      ["All teams", "Platform", "Payments", "Messaging", "Search", "Risk"],
      "All teams",
      refresh,
    );
    let windowValue = "Own";
    const shell = bench.grid.parentElement!;
    const chartPanel = make("section", "", "reliability-chart");
    chartPanel.setAttribute("aria-label", "Budget index");
    shell.append(chartPanel);
    const tabBar = make("div");
    let statusTabs: ReturnType<typeof mountTabs<"All" | ViewRow["status"]>> | undefined;
    bench.heading.insertAdjacentElement("afterend", tabBar);
    const windows = make("div", "", "reliability-windows");
    const windowsRoot = createRoot(windows);
    const updateWindows = () => windowsRoot.render(createElement(SegmentedSwitch, {
      value: windowValue, role: 'group', ariaLabel: 'Rolling window',
      options: ['Own', '7D', '28D', '30D'].map(value => ({ value, label: value })),
      onChange: (value: string | number) => { if (typeof value === 'string') { windowValue = value; refresh(); } },
    }));
    bench.onDispose(() => windowsRoot.unmount());
    const add = button("New SLO", () => edit(), true);
    bench.heading.append(add);
    bench.toolbar.append(scope, windows, team);
    bench.onSearch(refresh);
    const pluginReady = customElements
      .whenDefined("revo-grid")
      .then(() => bench.grid.componentOnReady())
      .then(() => bench.grid.getPlugins())
      .then((plugins) => plugins.find((plugin) => plugin instanceof RowChartHoverPlugin));
    const hoverLink = createCategoryRowHoverLink({
      getChart: () => activeChart,
      getRowPlugin: () => pluginReady,
      highlightChartOnChartHover: true,
    });
    bench.grid.rowChartHover = { key: "id", onHover: hoverLink.onRowHover };
    function measured(row: Slo) {
      if (scope.value === "Own objective" && windowValue === "Own")
        return row.budget;
      const objective =
        scope.value === "Own objective"
          ? row.objective
          : Number(scope.value.replace("%", ""));
      const targetAllowance = Math.max(0.0001, 100 - objective),
        originalAllowance = Math.max(0.0001, 100 - row.objective);
      const targetWindow =
        windowValue === "Own" ? row.window : Number(windowValue.slice(0, -1));
      const spent =
        (((100 - row.budget) * originalAllowance) / targetAllowance) *
        (targetWindow / row.window);
      return Math.max(-500, Math.min(100, 100 - spent));
    }
    function allRows(): ViewRow[] {
      return data.map((row) => {
        const value = measured(row);
        return { ...row, measured: value, status: level(value), ownerAvatar: personPortrait(row.owner) };
      });
    }
    function visible(): ViewRow[] {
      const query = bench.currentQuery();
      return allRows()
        .filter(
          (row) =>
            (tab === "All" || row.status === tab) &&
            (team.value === "All teams" || row.team === team.value) &&
            (!query ||
              matches(query, row.name, row.service, row.team, row.owner)),
        )
        .sort((a, b) => {
          if (sort === "triage") {
            const paging = Number(b.alert === "Paging") - Number(a.alert === "Paging");
            return paging || a.measured - b.measured || a.days - b.days || a.name.localeCompare(b.name);
          }
          const result =
            sort === "name"
              ? a.name.localeCompare(b.name)
              : sort === "alert"
                ? a.alert.localeCompare(b.alert)
                : sort === "days"
                  ? a.days - b.days
                  : a.measured - b.measured;
          return (ascending ? 1 : -1) * result || a.name.localeCompare(b.name);
        });
    }
    function drawTabs(all: ViewRow[]) {
      const names = ["All", "Exhausted", "At Risk", "Healthy"] as const;
      const options = names.map(name => ({ value: name, label: name, count: name === "All" ? all.length : all.filter(row => row.status === name).length }));
      const props = { value: tab, options, ariaLabel: "Reliability status", className: "reliability-tabs rv-tabs--underline", countClassName: badgeClassName({ variant: "neutral", shape: "pill" }), onChange: (next: typeof tab) => { tab = next; refresh(); } };
      if (statusTabs) statusTabs.update(props); else statusTabs = mountTabs(tabBar, props);
    }
    function refresh() {
      const all = allRows();
      const visibleRows = visible();
      drawTabs(all);
      updateWindows();
      bench.setSubtitle(
        `${all.length} SLOs • ${all.filter((row) => row.status === "Exhausted").length} exhausted • ${all.filter((row) => row.alert === "Paging").length} paging`,
      );
      bench.render(columns, visibleRows as unknown as DataType[]);
      if (!visibleRows.some((row) => row.id === selectedId))
        selectedId = visibleRows[0]?.id ?? "";
      renderChart(visibleRows);
    }
    function sortBy(key: typeof sort) {
      if (sort === key) ascending = !ascending;
      else {
        sort = key;
        ascending = true;
      }
      refresh();
    }
    let legendRoot: ReturnType<typeof createRoot> | undefined;
    let chartSwitchRoot: ReturnType<typeof createRoot> | undefined;
    function renderChart(visibleRows: ViewRow[]) {
      legendRoot?.unmount(); legendRoot = undefined;
      chartSwitchRoot?.unmount(); chartSwitchRoot = undefined;
      const generation = ++chartGeneration;
      hoverLink.reset();
      activeChart = undefined;
      chartPanel.replaceChildren();
      const chosen = visibleRows.find((row) => row.id === selectedId);
      const header = make("div", "", "reliability-chart__head");
      const text = make("div");
      text.append(
        make("strong", "Selected service"),
        make(
          "small",
          chosen
            ? `${chosen.name} • ${chosen.status} • ${chosen.alert} • ${signed(chosen.measured)} remaining`
            : "No SLOs match",
        ),
      );
      const details = button("Details", () => {
        const item = visible().find((row) => row.id === selectedId);
        if (item) showDetails(item);
      });
      details.disabled = !chosen;
      header.append(text, details);
      chartPanel.append(header);
      if (!visibleRows.length) {
        chartPanel.append(
          make("p", "No matching SLOs", "reliability-chart__empty"),
        );
        return;
      }
      const switchHost = make("div", "", "reliability-chart__switch");
      chartSwitchRoot = createRoot(switchHost);
      chartSwitchRoot.render(createElement(SegmentedSwitch, {
        value: chartView, role: 'group', ariaLabel: 'Chart view',
        options: [{ value: 'History', label: 'History' }, { value: 'Compare', label: 'Compare' }],
        onChange: (value: string | number) => {
          if (value === 'History' || value === 'Compare') { chartView = value; queueMicrotask(() => { if (!disposed) renderChart(visible()); }); }
        },
      }));
      chartPanel.append(switchHost);
      if (chartView === 'History' && chosen) {
        const last = chosen.trend.at(-1) ?? 0;
        const values = chosen.trend.map(value => chosen.budget + value - last);
        const history = createChartHost(document, {
          mount: (container, signal) => createSparklineChart({
            container, signal, data: values,
            x: values.map((_, index) => `Day ${index + 1}`),
            plotType: 'area', color: chosen.budget < 0 ? demoColors.pink : demoColors.tealMuted,
            seriesOverrides: { value: { fillOpacity: 0.12, lineWidth: 1.5 } },
            rendererOptions: { transitions: false }, showTooltip: true,
          }),
          onError: (_error, container) => { container.textContent = 'Chart unavailable'; },
        });
        history.className = 'reliability-chart__plot reliability-chart__plot--history';
        history.setAttribute('role', 'group');
        history.setAttribute('aria-label', `${chosen.name} sample budget history over 30 days`);
        const caption = make('p', 'Illustrative 30-day history · own objective', 'reliability-chart__caption');
        const dates = make('div', '', 'reliability-chart__dates');
        dates.append(make('span', '30 days ago'), make('span', 'Today'));
        chartPanel.append(caption, history, dates);
        return;
      }
      const minimumBudget = Math.min(-100, Math.floor(visibleRows.reduce((minimum, row) => Math.min(minimum, row.measured), 0) / 100) * 100);
      const budgetTicks = minimumBudget === -100 ? [-100, -50, 0, 50, 100] : [minimumBudget, minimumBudget / 2, 0, 50, 100];
      const host = createChartHost(document, {
        mount: async (container, signal) => {
          const chart = await createLollipopChart({
            container,
            signal,
            data: visibleRows.map((row) => ({
              id: row.id,
              name: row.name,
              value: row.measured,
            })),
            mapping: {
              category: { field: "id", label: "name" },
              series: [{ field: "value", label: "Budget left" }],
            },
            presentation: { legendPosition: "none" },
            axes: {
              x: { position: "none" },
              y: { min: minimumBudget, max: 100, tickValues: budgetTicks },
            },
            rendererOptions: {
              minimumSize: { width: 1, height: 1 },
              transitions: false,
              theme: {
                grid: "var(--rv-ui-border)",
                foreground: "var(--rv-ui-text-muted)",
                muted: "var(--rv-ui-text-muted)",
              },
              tooltip: {
                className: "reliability-chart-tooltip demo-chart-tooltip",
                showDelayMs: 200,
                formatter: ({ value, category }) =>
                  `${typeof value === "number" ? signed(value) : "—"}  •  ${category.label}`,
              },
              labels: {
                formatter: ({ kind, axis, defaultText }) =>
                  kind === "axisTick" && axis === "y"
                    ? `${Number(defaultText) > 0 ? "+" : ""}${defaultText}%`
                    : defaultText,
              },
              elements: {
                formatter: ({ tagName, value, attributes }) =>
                  attributes["data-pivot-chart-lollipop-stem"] !== undefined
                    ? {
                        stroke: "var(--rv-ui-border)",
                        strokeWidth: 1.5,
                        strokeDasharray: "3 3",
                      }
                    : tagName === "circle" &&
                        attributes["data-pivot-chart-lollipop"] !== undefined &&
                        typeof value === "number"
                      ? {
                          fill:
                            value < 0
                              ? demoColors.pink
                              : value < 25
                                ? demoColors.orange
                                : demoColors.teal,
                        }
                      : undefined,
              },
            },
            onHoverChange: (hover) => {
              if (generation === chartGeneration) hoverLink.onChartHover(hover);
            },
            onNodeClick: (detail) => {
              const id = detail.category?.path[0];
              if (typeof id === "string") {
                selectedId = id;
                const item = visibleRows.find((row) => row.id === id);
                if (item) {
                  text.querySelector("small")!.textContent =
                    `${item.name}  •  ${signed(item.measured)}  •  ${item.objective}% over ${item.window}d`;
                }
              }
            },
          });
          if (signal.aborted) {
            chart.destroy();
            return { destroy() {} };
          }
          activeChart = chart;
          return {
            destroy() {
              if (activeChart === chart) activeChart = undefined;
              chart.destroy();
            },
          };
        },
        onError: (_error, container) => {
          container.textContent = "Chart unavailable";
        },
      });
      host.className = "reliability-chart__plot";
      host.setAttribute("role", "group");
      host.setAttribute(
        "aria-label",
        `Budget left for ${visibleRows.length} SLOs`,
      );
      chartPanel.append(host);
      const legend = make("div");
      legendRoot = createRoot(legend);
      legendRoot.render(createElement(Legend, {
        label: "Reliability status", className: "reliability-chart__legend",
        items: ([['Healthy', demoColors.teal], ['At Risk', demoColors.orange], ['Exhausted', demoColors.pink]] as const).map(([name, color]) => ({
          id: name, label: `${name} ${visibleRows.filter(row => row.status === name).length}`, color,
        })),
      }));
      chartPanel.append(legend);
    }
    function showDetails(row: ViewRow) {
      selectedId = row.id;
      renderChart(visible());
      const content = make("div", "", "reliability-detail");
      const tabs = make("div");
      const detailSwitch = createRoot(tabs);
      const panel = make("div", "", "reliability-detail__panel");
      const options = ["Overview", "Burn Rate", "Events", "Settings"].map(name => ({ value: name, label: name }));
      const renderSwitch = (value: string) => detailSwitch.render(createElement(SegmentedSwitch, {
        value, options, role: 'group', ariaLabel: 'Reliability details', className: 'reliability-detail__switch',
        onChange: (next: string | number) => { if (typeof next === 'string') show(next); },
      }));
      function detailChart(kind: "budget" | "burn") {
        const values = kind === "budget" ? row.trend : row.trend.map((value, index, all) => index ? Math.abs(value - all[index - 1]) : 0);
        const host = createChartHost(document, {
          mount: (container, signal) => createSparklineChart({
            container, signal, data: values,
            x: values.map((_, index) => `Day ${index + 1}`),
            plotType: "area", color: kind === "budget" && row.measured < 0 ? demoColors.pink : demoColors.tealMuted,
            axes: { y: kind === "budget" ? { min: -100, max: 100 } : { min: 0, max: Math.max(1, ...values) * 1.2 } },
            seriesOverrides: { value: { fillOpacity: 0.12, lineWidth: 1.5 } },
            rendererOptions: { transitions: false },
            showTooltip: true,
          }),
          onError: (_error, container) => { container.textContent = "Chart unavailable"; },
        });
        host.className = "reliability-detail__chart";
        host.setAttribute("role", "group");
        host.setAttribute("aria-label", `${row.name} ${kind === "budget" ? "budget left" : "burn rate"} over 30 days`);
        return host;
      }
      function show(name: string) {
        renderSwitch(name);
        panel.replaceChildren();
        if (name === "Overview") {
          panel.append(
            make("h3", "Burn-Down"),
            make(
              "p",
              `${Math.abs(row.measured).toFixed(1)}% ${row.measured < 0 ? "over budget" : "budget left"}`,
            ),
            make(
              "p",
              `${row.kind} · ${row.objective}% over ${row.window} days · ${row.service}`,
            ),
            detailChart("budget"),
            make("h3", "Budget"),
            make("p", `Attainment ${row.objective}% · Owner ${row.owner}`),
          );
        } else if (name === "Burn Rate") {
          panel.append(
            make("h3", "Burn Rate"),
            make(
              "p",
              `Budget left ${signed(row.measured)} · ${row.days ? `${row.days} days remaining` : "Spent"}`,
            ),
            detailChart("burn"),
          );
        } else if (name === "Events") {
          panel.append(
            make("h3", "Events"),
            make(
              "p",
              row.alert === "Paging"
                ? "Paging alert active"
                : "No active incidents",
            ),
          );
        } else {
          const actions = make("div", "", "reliability-detail__actions");
          actions.append(button("Edit SLO", () => edit(row)), deleteButton("Delete SLO", () => remove(row)));
          panel.append(
            make("h3", "Settings"),
            make(
              "p",
              `Objective ${row.objective}% · Window ${row.window} days · ${row.team}`,
            ),
            actions,
          );
        }
      }
      content.append(make("p", `${row.status} · ${row.service}`, "reliability-detail__subtitle"), tabs, panel);
      show("Overview");
      bench.details(row.name, [content], () => detailSwitch.unmount());
    }
    function edit(row?: Slo) {
      const name = input("Name", row?.name ?? "");
      name.required = true;
      const service = input("Service", row?.service ?? "");
      service.required = true;
      const objective = input(
        "Objective",
        String(row?.objective ?? 99.9),
        "number",
      );
      objective.min = "90";
      objective.max = "99.999";
      objective.step = "0.001";
      const length = select(
        "Window",
        ["7", "28", "30"],
        String(row?.window ?? 28),
      );
      const owner = input("Owner", row?.owner ?? "");
      const group = select(
        "Team",
        ["Platform", "Payments", "Messaging", "Search", "Risk"],
        row?.team ?? "Platform",
      );
      bench.form(
        row ? "Edit SLO" : "New SLO",
        [
          field("Name", name),
          field("Service", service),
          field("Objective %", objective),
          field("Window days", length),
          field("Owner", owner),
          field("Team", group),
        ],
        () => {
          const goal = Number(objective.value);
          if (
            !name.value.trim() ||
            !service.value.trim() ||
            !Number.isFinite(goal) ||
            goal < 90 ||
            goal >= 100
          )
            return false;
          if (row)
            Object.assign(data.find((item) => item.id === row.id)!, {
              name: name.value.trim(),
              service: service.value.trim(),
              objective: goal,
              window: Number(length.value),
              owner: owner.value,
              team: group.value,
            });
          else
            data.push({
              id: `slo-${Date.now()}`,
              name: name.value.trim(),
              service: service.value.trim(),
              team: group.value,
              objective: goal,
              window: Number(length.value),
              budget: 100,
              days: 0,
              alert: "Quiet",
              kind: "Availability",
              owner: owner.value,
              trend: Array(30).fill(100),
            });
          refresh();
          bench.report(row ? "SLO updated." : "SLO created.");
        },
        undefined,
        row ? "Save" : "Create SLO",
      );
    }
    function remove(row: Slo) {
      bench.form(
        "Delete SLO?",
        [make("p", `Delete ${row.name}?`)],
        () => {
          const index = data.findIndex((item) => item.id === row.id);
          if (index < 0) return;
          const removed = data.splice(index, 1)[0];
          refresh();
          bench.report(`${row.name} deleted.`, () => {
            data.splice(index, 0, removed);
            refresh();
          });
        },
        undefined,
        "Delete",
        undefined,
        { submit: { variant: "danger", icon: "trash" } },
      );
    }
    const sortableHeader = (key: typeof sort, label: string): NonNullable<ColumnRegular["columnTemplate"]> => (h) =>
      renderCellAction(h, {
        className: key === "name" ? "reliability-sort reliability-sort--name" : "reliability-sort",
        label: `Sort ${label}`,
        text: `${label} ↕`,
        onActivate: event => { event.stopPropagation(); sortBy(key); },
      });
    const columns: ColumnData = [
      {
        prop: "name",
        name: "SLO",
        size: 200,
        columnTemplate: sortableHeader("name", "SLO"),
        cellTemplate: entityCellRenderer,
        entityCell: {
          format: (_value, model) => ({
            kind: "identity",
            className: "reliability-name",
            label: String(model.name),
            detail: `${model.service}  •  ${model.objective}%  •  ${model.window}d`,
            actionLabel: `Open ${model.name}`,
          }),
          onActivate: (model) => showDetails(model as ViewRow),
        },
      },
      {
        prop: "owner",
        name: "Owner",
        size: 65,
        cellTemplate: avatarRenderer,
        avatarProp: "ownerAvatar",
        avatarLabelProp: "owner",
        avatarSize: 24,
      },
      {
        prop: "trend",
        name: "90 Days",
        size: 110,
        cellTemplate: comparisonSparklineRenderer,
        comparisonSparkline: {
          label: (model) =>
            `${model.name}, budget left per 3 days over 90 days`,
          series: [{ color: demoColors.teal, fill: "solid", fillOpacity: 0.12, belowThreshold: { value: 0, color: demoColors.pink } }],
          minValue: -45,
          maxValue: 100,
        },
      },
      {
        prop: "measured",
        columnType: "number",
        name: "Budget Left",
        size: 112,
        columnTemplate: sortableHeader("budget", "Budget Left"),
        cellTemplate: visualCellRenderer,
        visualCell: { format: (_value, model) => ({ kind: "text", element: "strong", className: `metric-number reliability-value is-${String(model.status).toLowerCase().replace(" ", "-")}`, text: signed(Number(model.measured)) }) },
      },
      {
        prop: "days",
        columnType: "number",
        name: "Runs Out",
        size: 90,
        columnTemplate: sortableHeader("days", "Runs Out"),
        cellTemplate: visualCellRenderer,
        visualCell: { format: (_value, model) => ({ kind: "text", className: model.status === "Exhausted" ? "metric-number reliability-value is-exhausted" : "metric-number", text: model.status === "Exhausted" ? "Spent" : `${model.days} days` }) },
      },
      {
        prop: "alert",
        name: "Alert",
        size: 80,
        columnTemplate: sortableHeader("alert", "Alert"),
        cellTemplate: visualCellRenderer,
        visualCell: { format: (_value, model) => ({ kind: "text", className: `reliability-alert is-${String(model.alert).toLowerCase()}`, text: String(model.alert) }) },
      },
    ];
    bench.onDispose(() => {
      disposed = true;
      legendRoot?.unmount();
      statusTabs?.destroy();
      chartGeneration++;
      chartSwitchRoot?.unmount();
      hoverLink.destroy();
      activeChart = undefined;
    });
    refresh();
  },
};
