import { renderControl } from '@revolist/ui/native';
import { demoColors } from '../../../../composables/demo-colors';
import { ROW_ACTION_COLUMN_WIDTH } from '../../../../composables/row-action';
import { createMetricTileHistoryTooltip, METRIC_TILE_HISTORY_TOOLTIP } from "@revolist/revogrid-pro";
import type { ColumnData, DataType } from "@revolist/revogrid";
import {
  entityCellRenderer,
  groupSummaryRenderer,
  metricTrendRenderer,
  metricStackRenderer,
  stripPlotRenderer,
  createScaledPlotColumnType,
  renderSortMenuHeader,
  timelineRenderer,
  cellActionRenderer,
  createDotHistogramElement,
  createSegmentedSummaryElement,
  releaseSummaryChartElement,
  type MergeData,
} from "@revolist/revogrid-pro";
import {
  button,
  deleteButton,
  field,
  input,
  make,
  matches,
  select,
  personSelect,
  type Example,
} from "../../shared/workbench-ui";

import { buyers, divisions, tiers, initial, colors, money, read, score, rate, signed, percentChange, scoreChange, rateChange, lotDate, plot, type Division, type Tier, type Disposition, type Lot, type Supplier, type Reading, type QualityRow } from './supplier-quality-data';

export const supplierQuality: Example = {
  id: "supplier-quality",
  title: "Supplier Quality Dashboard",
  description: "Last 12 months • 24 suppliers • bubbles sized by lot value",
  setup(bench) {
    const suppliers = structuredClone(initial);
    bench.grid.rowClass = "qualityRowClass";
    bench.grid.tooltip = {
      anchorToTarget: true,
      showDelayMs: 200,
      renderContent: ({ content, type, document }) => type === METRIC_TILE_HISTORY_TOOLTIP ? createMetricTileHistoryTooltip(document, content) : undefined,
    };
    let expandedDivisions = new Set<Division>(divisions);
    const closedTiers = new Set<string>();
    let highlight: Disposition | undefined;
    let sortKey: "score" | "rate" | "spend" | "lots" | "rejected" | undefined;
    let descending = true;
    const groupMode = select(
      "Rows",
      ["Suppliers", "Tiers", "Divisions"],
      "Suppliers",
      refresh,
    );
    const period = select(
      "Period",
      ["Last 12 months", "Last 6 months", "Last 3 months"],
      "Last 12 months",
      refresh,
    );
    const divisionFilter = select(
      "Division",
      ["All Divisions", ...divisions],
      "All Divisions",
      refresh,
    );
    const exceptions = select(
      "Quality queue",
      ["All suppliers", "Rejected or rework", "Rejected lots", "Rework lots"],
      "All suppliers",
      refresh,
    );
    divisionFilter.dataset.toolbar = "main";
    const add = button("Add Supplier", () => editSupplier(), true);
    bench.heading.append(add);
    bench.toolbar.append(divisionFilter, groupMode, period, exceptions);
    bench.onSearch(refresh);
    bench.onCompactChange(refresh);
    function months() {
      return period.value === "Last 3 months"
        ? 3
        : period.value === "Last 6 months"
          ? 6
          : 12;
    }
    function filtered() {
      const query = bench.currentQuery();
      return suppliers.filter(
        (s) => {
          if (divisionFilter.value !== "All Divisions" && s.division !== divisionFilter.value) return false;
          if (query && !matches(query, s.name, s.division, s.tier, s.buyer, s.status)) return false;
          if (exceptions.value === "All suppliers") return true;
          const reading = read([s], months());
          if (exceptions.value === "Rejected lots") return reading.rejected > 0;
          if (exceptions.value === "Rework lots") return reading.rework > 0;
          return reading.rejected + reading.rework > 0;
        },
      );
    }
    function summary(rows: Supplier[]) {
      const data = read(rows, months());
      const previous = read(rows, months(), months());
      bench.summary.hidden = false;
      bench.summary.className = "workbench-stats quality-summary";
      bench.summary.replaceChildren();
      for (const [key, label, value, detail] of [
        [
          "rejected",
          "Rejected",
          String(data.rejected),
          signed(data.rejected - previous.rejected, 0),
        ],
        ["score", "Avg Score", score(data), scoreChange(data, previous)],
        ["rate", "Accepted", rate(data), rateChange(data, previous)],
        [
          "spend",
          "Spend",
          money(data.spend),
          percentChange(data.spend, previous.spend),
        ],
        [
          "lots",
          "Lots",
          String(data.lots.length),
          percentChange(data.lots.length, previous.lots.length),
        ],
      ] as const) {
        const card = button("", () => {
          if (sortKey === key) descending = !descending;
          else {
            sortKey = key;
            descending = true;
          }
          refresh();
        });
        card.className = `quality-summary__item quality-summary__item--${key}`;
        card.setAttribute("aria-label", `${label} ${value}, sort by it`);
        card.setAttribute("aria-pressed", String(sortKey === key));
        card.append(
          make("span", label),
          make("strong", value),
          make("small", detail),
        );
        bench.summary.append(card);
      }
    }
    function compare(a: Supplier, b: Supplier) {
      if (!sortKey) return a.id - b.id;
      const x = read([a], months()),
        y = read([b], months());
      const value = (r: Reading) =>
        sortKey === "score"
          ? (r.score ?? -1)
          : sortKey === "rate"
            ? (r.rate ?? -1)
            : sortKey === "spend"
              ? r.spend
              : sortKey === "lots"
                ? r.lots.length
                : r.rejected;
      return (
        (value(x) - value(y)) * (descending ? -1 : 1) ||
        a.name.localeCompare(b.name)
      );
    }
    function refresh() {
      const current = filtered(),
        all = read(current, months());
      summary(current);
      bench.setSubtitle(
        `${period.value} • ${current.length} suppliers • bubbles sized by lot value`,
      );
      const rows: QualityRow[] = [];
      const merges: MergeData[] = [];
      for (const division of divisions) {
        const inDivision = current.filter((s) => s.division === division);
        if (!inDivision.length) continue;
        const divisionReading = read(inDivision, months());
        const start = rows.length;
        const open = expandedDivisions.has(division);
        if (open && groupMode.value !== "Divisions") {
          for (const tier of tiers) {
            const inTier = inDivision
              .filter((s) => s.tier === tier)
              .sort(compare);
            if (!inTier.length) continue;
            const data = read(inTier, months());
            const expanded = !closedTiers.has(`${division}:${tier}`);
            rows.push({
              label: tier,
              division,
              tier,
              group: true,
              qualityRowClass: "quality-subgroup",
              expanded,
              reading: data,
              accepted: data.rate, spend: data.spend, lots: data.lots.length,
              previous: read(inTier, months(), months()),
              trend: data.trend,
              plot: plot(data, highlight),
            });
            if (expanded && groupMode.value === "Suppliers")
              for (const supplier of inTier) {
                const data = read([supplier], months());
                rows.push({
                  label: supplier.name,
                  division,
                  tier,
                  supplier,
                  reading: data,
                  accepted: data.rate, spend: data.spend, lots: data.lots.length,
                  previous: read([supplier], months(), months()),
                  trend: data.trend,
                  plot: plot(data, highlight),
                });
              }
          }
        } else {
          const data = divisionReading;
          rows.push({
            label: `${inDivision.length} suppliers`,
            division,
            group: true,
            qualityRowClass: "quality-subgroup",
            expanded: open,
            reading: data,
            accepted: data.rate, spend: data.spend, lots: data.lots.length,
            previous: read(inDivision, months(), months()),
            trend: data.trend,
            plot: plot(data, highlight),
          });
        }
        if (rows.length === start) continue;
        rows[start].divisionHead = true;
        rows[start].divisionCompact = rows.length - start === 1;
        rows[start].divisionCount = inDivision.length;
        rows[start].divisionReading = divisionReading;
        if (rows.length - start > 1)
          merges.push({
            row: start,
            rowSpan: rows.length - start,
            column: 0,
            colType: "colPinStart",
          });
      }
      bench.mergeCells(merges);
      const totalRow = {
        label: `Total ${current.length} suppliers`,
        total: true,
        reading: all,
        accepted: all.rate, spend: all.spend, lots: all.lots.length,
        previous: read(current, months(), months()),
        trend: all.trend,
        plot: plot(all, highlight),
      };
      bench.render(columns, rows as unknown as DataType[], [], [totalRow]);
    }
    function toggleDivision(division: Division) {
      if (groupMode.value === "Divisions") {
        groupMode.value = "Tiers";
        expandedDivisions.add(division);
        refresh();
        return;
      }
      if (expandedDivisions.has(division)) expandedDivisions.delete(division);
      else expandedDivisions.add(division);
      refresh();
    }
    function toggleTier(row: QualityRow) {
      if (!row.tier) return;
      const key = `${row.division}:${row.tier}`;
      if (groupMode.value !== "Suppliers") {
        groupMode.value = "Suppliers";
        closedTiers.delete(key);
      } else if (closedTiers.has(key)) closedTiers.delete(key);
      else closedTiers.add(key);
      refresh();
    }
    function showSupplier(supplier: Supplier) {
      const r = read([supplier], months());
      const list = make("div", "", "quality-detail");
      const meta = make("p", `${supplier.division} · ${supplier.tier} · ${supplier.status}`, "quality-detail__meta");
      const buyer = make("p", `Buyer: ${supplier.buyer}`, "quality-detail__buyer");
      const metrics = make("div", "", "quality-detail__metrics");
      for (const [label, value] of [
        ["Average score", score(r)],
        ["Accepted", rate(r)],
        ["Spend", money(r.spend)],
      ]) {
        const metric = make("div");
        metric.append(make("span", label), make("strong", value));
        metrics.append(metric);
      }
      list.append(meta, buyer, metrics);
      const recent = make("section", "", "quality-detail__lots");
      const heading = make("div", "", "quality-detail__lots-heading");
      heading.append(make("h3", "Inspected lots"), make("span", `${r.lots.length} ${r.lots.length === 1 ? "lot" : "lots"}`));
      recent.append(heading);
      const charts: HTMLElement[] = [];
      if (r.lots.length) {
        const layout = make("div", "", "quality-detail__lot-layout");
        const distribution = make("aside", "", "quality-detail__distribution");
        distribution.append(make("h4", "Score distribution"), make("p", `${period.value} · ${r.lots.length} inspected`));
        const histogram = createDotHistogramElement(document, {
          values: r.lots.map(lot => lot.score), label: `Scores for ${r.lots.length} inspected lots`,
          bins: 11, maxPoints: r.lots.length, maxStack: r.lots.length,
          formatValue: value => value.toFixed(1),
          tooltip: (value, index) => ({ title: r.lots[index].product, subtitle: r.lots[index].disposition, metricLabel: 'Score', metricValue: value.toFixed(1) }),
        });
        const scores = r.lots.map(lot => lot.score);
        const low = Math.min(...scores), high = Math.max(...scores);
        const bins = new Map<number, number>();
        for (const value of scores) {
          const bin = high === low ? 0 : Math.round((value - low) / (high - low) * 10);
          bins.set(bin, (bins.get(bin) ?? 0) + 1);
        }
        histogram.style.setProperty('--rv-dot-histogram-height', `${Math.max(36, Math.max(...bins.values()) * 5 + 4)}px`);
        const dispositions = createSegmentedSummaryElement(document, {
          label: `${r.accepted} accepted, ${r.rework} rework, ${r.rejected} rejected`,
          parts: [{ label: 'Accepted', value: r.accepted, color: demoColors.teal }, { label: 'Rework', value: r.rework, color: demoColors.orange }, { label: 'Rejected', value: r.rejected, color: demoColors.pink }],
        });
        charts.push(histogram, dispositions);
        distribution.append(histogram, make('h4', 'Disposition'), dispositions);
        const scroll = make("div", "", "quality-detail__table-scroll");
        scroll.tabIndex = 0;
        scroll.setAttribute("role", "region");
        scroll.setAttribute("aria-label", "Inspected lots");
        const table = make("table", "", "quality-detail__table");
        table.setAttribute("aria-label", "Inspected lots");
        const head = make("thead");
        const header = make("tr");
        for (const label of ["Lot", "Score", "Status", "Value"]) {
          const cell = make("th", label);
          cell.scope = "col";
          header.append(cell);
        }
        head.append(header);
        const body = make("tbody");
        for (const lot of r.lots) {
          const row = make("tr");
          const status = make("td");
          status.append(make("span", lot.disposition, `quality-detail__status is-${lot.disposition.toLowerCase()}`));
          row.append(make("td", lot.product), make("td", lot.score.toFixed(1)), status, make("td", money(lot.value)));
          body.append(row);
        }
        table.append(head, body);
        scroll.append(table);
        layout.append(scroll, distribution);
        recent.append(layout);
      } else recent.append(make("p", "No lots inspected", "quality-detail__empty"));
      const actions = make("div", "", "quality-detail__actions");
      actions.append(
        button("Edit supplier", () => editSupplier(supplier)),
        deleteButton("Delete supplier", () => deleteSupplier(supplier)),
      );
      list.append(
        recent,
        actions,
      );
      bench.details(supplier.name, [list], () => charts.forEach(releaseSummaryChartElement));
    }
    function deleteSupplier(supplier: Supplier) {
      bench.form(
        "Delete supplier?",
        [make("p", `Delete ${supplier.name}?`)],
        () => {
          const index = suppliers.indexOf(supplier);
          if (index < 0) return;
          suppliers.splice(index, 1);
          refresh();
          bench.report(`${supplier.name} deleted.`, () => {
            suppliers.splice(index, 0, supplier);
            refresh();
          });
        },
        undefined,
        "Delete",
        undefined,
        { submit: { variant: "danger", icon: "trash" } },
      );
    }
    function editSupplier(
      supplier?: Supplier,
      initialDivision: Division = "Electronics",
      initialTier: Tier = "Trial",
    ) {
      const name = input("Name", supplier?.name ?? "");
      name.required = true;
      const division = select(
        "Division",
        divisions,
        supplier?.division ?? initialDivision,
      );
      const tier = select("Tier", tiers, supplier?.tier ?? initialTier);
      const status = select(
        "Status",
        ["Active", "Onboarding", "Probation"],
        supplier?.status ?? "Onboarding",
      );
      const buyer = personSelect("Buyer", buyers, supplier?.buyer ?? buyers[0]);
      bench.form(
        supplier ? "Edit Supplier" : "New Supplier",
        [
          make("p", "No lots until its first inspection."),
          field("Name", name),
          field("Division", division),
          field("Tier", tier),
          field("Status", status),
          field("Buyer", buyer),
        ],
        () => {
          if (!name.value.trim()) return false;
          if (supplier)
            Object.assign(supplier, {
              name: name.value.trim(),
              division: division.value,
              tier: tier.value,
              status: status.value,
              buyer: buyer.value,
            });
          else
            suppliers.push({
              id: Math.max(-1, ...suppliers.map((s) => s.id)) + 1,
              name: name.value.trim(),
              division: division.value as Division,
              tier: tier.value as Tier,
              status: status.value,
              buyer: buyer.value,
              lots: [],
            });
          expandedDivisions.add(division.value as Division);
          closedTiers.delete(`${division.value}:${tier.value}`);
          refresh();
          bench.report(supplier ? "Supplier updated." : "Supplier added.");
        },
        undefined,
        supplier ? "Save" : "Create Supplier",
      );
    }
    bench.grid.columnTypes = {
      ...bench.grid.columnTypes,
      qualityScorePlot: createScaledPlotColumnType({
        title: "Lot Scores",
        titleContent: (h) => renderSortMenuHeader(h, { label: "Lot Scores", ariaLabel: "Lot Scores column menu", className: "quality-header-menu" }),
        domain: { min: 3.5, max: 10 },
        ticks: [4, 5, 6, 7, 8, 9, 10],
        formatTick: value => value.toFixed(1),
        headerContent: h => ([("Accepted"), ("Rework"), ("Rejected")] as Disposition[]).map(key => renderControl(h, "button", {
          type: "button",
          class: `quality-legend is-${key.toLowerCase()}`,
          "aria-pressed": String(highlight === key),
          onClick: (event: MouseEvent) => { event.stopPropagation(); highlight = highlight === key ? undefined : key; refresh(); },
        }, key)),
      cell: (h, props, extra, domain) => {
          const row = props.model as QualityRow;
          const r = row.reading;
          if (!r.lots.length)
            return h("span", { class: "quality-no-lots" }, "No lots inspected");
          if (row.group || (row as QualityRow & { total?: boolean }).total) {
            const sorted = r.lots.map((lot) => lot.score).sort((a, b) => a - b);
            const at = (q: number) =>
              sorted[Math.round((sorted.length - 1) * q)];
            return timelineRenderer!(
              h,
              {
                ...props,
                value: [
                  {
                    start: at(0),
                    end: at(1),
                    label: "Score range",
                    className: "quality-range__whisker",
                  },
                  {
                    start: at(0.1),
                    end: at(0.9),
                    label: "Middle 80%",
                    className: "quality-range__band",
                  },
                ],
                column: {
                  ...props.column,
                  timelineRange: { start: domain.min, end: domain.max },
                  timelineAriaLabel: `Average ${score(r)}, scores from ${at(0).toFixed(1)} to ${at(1).toFixed(1)}`,
                  timelineTooltip: {
                    title: `${row.division ?? "All divisions"}${row.tier ? `, ${row.tier} tier` : ""}`,
                    subtitle: `Spread of ${r.lots.length} lots, ${period.value.toLowerCase()}`,
                    rows: [
                      { label: "Average", value: score(r) },
                      { label: "Middle 80% of Lots", value: `${at(0.1).toFixed(1)} to ${at(0.9).toFixed(1)}` },
                      { label: "Lowest Lot", value: `${at(0).toFixed(1)}, ${r.lots.find(lot => lot.score === at(0))!.product}` },
                      { label: "Highest Lot", value: `${at(1).toFixed(1)}, ${r.lots.find(lot => lot.score === at(1))!.product}` },
                    ],
                    footer: { text: `${r.rejected} rejected, ${r.rework} sent to rework`, color: demoColors.pink },
                  },
                  timelineMarkers: [
                    { value: r.score!, className: "quality-range__mean" },
                  ],
                },
              },
              extra,
            );
          }
          return stripPlotRenderer!(
            h,
            {
              ...props,
              column: {
                ...props.column,
                stripPlot: {
                  domain,
                  reference: r.score ?? undefined,
                  label: `Average ${score(r)} over ${r.lots.length} lots: ${r.accepted} accepted, ${r.rework} rework, ${r.rejected} rejected`,
                },
              },
            },
            extra,
          );
        },
      }),
    };
    let columns: ColumnData = [
      {
        prop: "division",
        name: "Division",
        size: 170,
        pin: "colPinStart",
        cellTemplate: groupSummaryRenderer,
        groupSummary: {
          format: (_value, model) => {
            if (!model.divisionHead) return;
            const row = model as QualityRow, r = row.divisionReading!, n = r.lots.length;
            const expanded = groupMode.value !== "Divisions" && expandedDivisions.has(row.division);
            return {
              className: `quality-rail${row.divisionCompact ? " quality-rail--compact" : ""}`, title: `${row.division}  ${row.divisionCount}`,
              actionLabel: `${row.division}, ${expanded ? "fold" : "expand"} its tiers`, expanded,
              value: score(r), valueDetail: " avg score", description: `${r.rejected} of ${n} lots rejected`,
              parts: { heading: "quality-rail__heading", value: "quality-rail__score", description: "quality-rail__warning", bar: "quality-rail__bar", segment: "quality-rail__key" },
              segments: (["Accepted", "Rework", "Rejected"] as Disposition[]).map(key => {
                const count = key === "Accepted" ? r.accepted : key === "Rework" ? r.rework : r.rejected;
                const percent = n ? count / n * 100 : 0;
                return { id: key, label: `${key}    ${count}    ${Math.round(percent)}%`, percent, pressed: highlight === key, className: `is-${key.toLowerCase()}` };
              }),
            };
          },
          onToggle: model => toggleDivision((model as QualityRow).division),
          onSegment: (_model, id) => { const key = id as Disposition; highlight = highlight === key ? undefined : key; refresh(); },
        },
      },
      {
        prop: "label",
        name: "Supplier",
        size: 212,
        pin: "colPinStart",
        cellTemplate: entityCellRenderer,
        entityCell: {
          format: (_value, model) => {
            const row = model as QualityRow & { total?: boolean };
            if (row.total)
              return { kind: "identity", label: row.label, interactive: false };
            if (row.divisionHead && row.divisionCompact)
              return { kind: "identity", label: row.label, interactive: false };
            if (row.group)
              return {
                kind: "group",
                variant: "tree",
                expandIcon: "chevron",
                className: "quality-tier",
                label: row.label,
                detail: `Avg ${score(row.reading)}`,
                expanded: row.expanded,
                actionLabel: `${row.expanded ? "Collapse" : "Expand"} ${row.division} ${row.tier ?? "division"}`,
                leading: row.tier
                  ? (h) =>
                      h(
                        "button",
                        {
                          type: "button",
                          class: "quality-tier-add demo-cell-add",
                          title: `Add ${row.tier} supplier in ${row.division}`,
                          "aria-label": `Add ${row.tier} supplier in ${row.division}`,
                          onMouseDown: (event: MouseEvent) =>
                            event.stopPropagation(),
                          onClick: (event: MouseEvent) => {
                            event.stopPropagation();
                            editSupplier(undefined, row.division, row.tier);
                          },
                        },
                        "+",
                      )
                  : undefined,
              };
            return {
              kind: "identity",
              className: "quality-supplier",
              label: row.label,
              detail:
                row.reading.score === null
                  ? "Awaiting first lot"
                  : `Avg ${score(row.reading)}  /  ${scoreChange(row.reading, row.previous)}${row.supplier?.status === "Probation" ? " · Probation" : ""}`,
              actionLabel: `Open ${row.label}`,
            };
          },
          onActivate: (model) => {
            const row = model as QualityRow;
            if (row.group && row.tier) toggleTier(row);
            else if (row.group && groupMode.value === "Divisions") {
              groupMode.value = "Tiers";
              expandedDivisions.add(row.division);
              refresh();
            } else if (row.group) toggleDivision(row.division);
            else if (row.supplier) showSupplier(row.supplier);
          },
        },
      },
      {
        prop: "accepted",
        columnType: "number",
        name: "Accepted",
        size: 106,
        cellTemplate: metricStackRenderer,
        metricStack: { format: (_value, model) => { const r = model.reading as Reading; return { value: rate(r), detail: r.rate === null ? undefined : rateChange(r, model.previous as Reading) }; } },
      },
      {
        prop: "spend",
        columnType: "currency",
        name: "Spend",
        size: 160,
        cellTemplate: metricTrendRenderer,
        metricTrend: {
          format: (_value, model) => {
            const r = model.reading as Reading;
            const previous = model.previous as Reading;
            const delta = r.spend - previous.spend;
            const change = previous.spend ? delta / previous.spend : 0;
            const tone = !previous.spend || Math.abs(change) < 0.02 ? 'neutral' : delta > 0 ? 'positive' : 'negative';
            return {
              className: 'quality-spend', layout: 'inline', value: r.lots.length ? money(r.spend) : 'No lots',
              detail: r.lots.length ? (previous.spend ? money(Math.abs(delta)) : 'New') : undefined,
              detailLabel: previous.spend ? `${money(Math.abs(delta))} ${delta >= 0 ? 'above' : 'below'} previous period` : 'New spend',
              tone, trend: tone === 'neutral' ? undefined : tone === 'positive' ? 'up' : 'down',
            };
          },
          showSparkline: model => (model.reading as Reading).lots.length > 0,
          sparkline: { label: model => `Spend trend for ${model.label}`, series: [{ prop: 'trend', color: 'var(--rv-ui-text-muted)', endpoint: 'hollow' }], tooltip: (_model, index, values) => `Period ${index + 1}: ${money(values[0] ?? 0)}` },
        },
      },
      {
        prop: "lots",
        columnType: "number",
        name: "Lots",
        size: 96,
        cellTemplate: metricStackRenderer,
        metricStack: { format: (_value, model) => { const r = model.reading as Reading; return { value: r.lots.length ? String(r.lots.length) : "No lots", detail: r.lots.length ? `${r.rejected} rejected` : undefined, tone: r.rejected ? "negative" : "neutral" }; } },
      },
      {
        prop: "plot",
        name: "Lot Scores",
        size: 390,
        columnType: "qualityScorePlot",

      },
      {
        prop: "actions",
        columnChooser: false,
        name: "",
        size: ROW_ACTION_COLUMN_WIDTH,
        cellTemplate: cellActionRenderer,
        cellAction: {
          label: (model) => `Actions for ${model.label}`,
          visible: (model) => !!model.supplier,
          onActivate: (model) => showSupplier(model.supplier as Supplier),
        },
      },
    ];
    columns = columns.map(column => column.name && "prop" in column && column.prop !== "plot"
      ? { ...column, columnTemplate: (h) => renderSortMenuHeader(h, { label: String(column.name), ariaLabel: `${column.name} column menu`, className: "quality-header-menu" }) }
      : column);
    refresh();
  },
};
