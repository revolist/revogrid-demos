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
const source: [
  string,
  string,
  string,
  number,
  number,
  number,
  number,
  Slo["alert"],
][] = [
  [
    "Order journal durability",
    "order-journal",
    "Platform",
    99.99,
    30,
    -78.6,
    0,
    "Quiet",
  ],
  [
    "Mobile alert delivery",
    "message-router",
    "Messaging",
    99.5,
    28,
    -53.4,
    0,
    "Quiet",
  ],
  ["Catalog search freshness", "catalog-indexer", "Search", 99, 7, -31.8, 0, "Quiet"],
  [
    "Settlement batch timeliness",
    "settlement-runner",
    "Payments",
    99.5,
    30,
    -14.2,
    0,
    "Quiet",
  ],
  ["Risk scoring latency", "risk-engine", "Risk", 99.9, 28, -6.1, 0, "Quiet"],
  [
    "Transaction journal freshness",
    "order-journal",
    "Platform",
    99.5,
    28,
    9.4,
    12,
    "Quiet",
  ],
  [
    "Settlement API availability",
    "settlement-runner",
    "Payments",
    99.9,
    28,
    19.2,
    1,
    "Quiet",
  ],
  ["Checkout API latency", "checkout-gateway", "Payments", 99, 28, 23.1, 25, "Quiet"],
  [
    "Event delivery success",
    "event-relay",
    "Platform",
    99.9,
    28,
    34.8,
    30,
    "Paging",
  ],
  [
    "Settlement reconciliation",
    "settlement-reporter",
    "Platform",
    99.9,
    30,
    49.6,
    10,
    "Ticket",
  ],
  [
    "Catalog query latency",
    "catalog-indexer",
    "Search",
    99.5,
    28,
    53.7,
    14,
    "Quiet",
  ],
  [
    "Checkout gateway availability",
    "checkout-gateway",
    "Payments",
    99.95,
    28,
    61.3,
    16,
    "Quiet",
  ],
  [
    "Event relay latency",
    "event-relay",
    "Platform",
    99,
    7,
    65.8,
    15,
    "Quiet",
  ],
  [
    "Mobile push latency",
    "message-router",
    "Messaging",
    99,
    7,
    72.2,
    17,
    "Muted",
  ],
  [
    "Settlement report freshness",
    "settlement-reporter",
    "Platform",
    99,
    7,
    77.4,
    22,
    "Muted",
  ],
  [
    "Receipt email delivery",
    "message-router",
    "Messaging",
    99.5,
    28,
    82.6,
    146,
    "Quiet",
  ],
  [
    "Returns API availability",
    "checkout-gateway",
    "Payments",
    99.9,
    28,
    87.1,
    209,
    "Quiet",
  ],
  [
    "Risk model availability",
    "risk-engine",
    "Risk",
    99.95,
    28,
    92.4,
    280,
    "Quiet",
  ],
];
const rows: Slo[] = source.map(
  ([name, service, team, objective, window, budget, days, alert], id) => ({
    id: `slo-${id}`,
    name,
    service,
    team,
    objective,
    window,
    budget,
    days,
    alert,
    kind: name.toLowerCase().includes("latency") ? "Latency" : "Availability",
    owner: ["Rina Patel", "Milo Chen", "Sofia Reyes", "Avery Brooks"][
      id % 4
    ],
    trend: Array.from({ length: 30 }, (_, i) =>
      (id === 7 || id === 8) && i === 24
        ? -28
        : 53 + Math.sin(i * 0.73 + id * 0.4) * 2.6 + Math.cos(i * 1.35 + id) * 0.9,
    ),
  }),
);
const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
const level = (budget: number): ViewRow["status"] =>
  budget < 0 ? "Exhausted" : budget < 25 ? "At Risk" : "Healthy";

export const reliabilityIndex: Example = {
  id: "reliability-index",
  title: "Service Reliability Dashboard",
  description: "18 SLOs • 5 exhausted • 1 paging",
  setup(bench) {
    const data = structuredClone(rows);
    let tab: "All" | ViewRow["status"] = "All";
    let sort: "budget" | "name" | "days" | "alert" = "budget";
    let ascending = true;
    let selectedId = "slo-0";
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
    function renderChart(visibleRows: ViewRow[]) {
      legendRoot?.unmount(); legendRoot = undefined;
      const generation = ++chartGeneration;
      hoverLink.reset();
      activeChart = undefined;
      chartPanel.replaceChildren();
      const chosen = visibleRows.find((row) => row.id === selectedId);
      const header = make("div", "", "reliability-chart__head");
      const text = make("div");
      text.append(
        make("strong", "Budget Index"),
        make(
          "small",
          chosen
            ? `${chosen.name}  •  ${signed(chosen.measured)}  •  ${chosen.objective}% over ${chosen.window}d`
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
                grid: "#efefef",
                foreground: "#737373",
                muted: "#737373",
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
                        stroke: "#d1d1d1",
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
        items: ([['Healthy', '#00a58f'], ['At Risk', '#f08a36'], ['Exhausted', '#ed3d69']] as const).map(([name, color]) => ({
          id: name, label: `${name} ${visibleRows.filter(row => row.status === name).length}`, color,
        })),
      }));
      chartPanel.append(legend);
    }
    function showDetails(row: ViewRow) {
      selectedId = row.id;
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
          actions.append(button("Edit SLO", () => edit(row)), button("Delete SLO", () => remove(row)));
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
      );
    }
    const sortableHeader = (key: typeof sort, label: string): NonNullable<ColumnRegular["columnTemplate"]> => (h) =>
      renderCellAction(h, { className: "reliability-sort", label: `Sort ${label}`, text: `${label} ↕`, onActivate: event => { event.stopPropagation(); sortBy(key); } });
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
      legendRoot?.unmount();
      statusTabs?.destroy();
      chartGeneration++;
      hoverLink.destroy();
      activeChart = undefined;
    });
    refresh();
  },
};
