import calendarPlusIcon from "@fortawesome/fontawesome-free/svgs/solid/calendar-plus.svg?raw";
import arrowsIcon from "@fortawesome/fontawesome-free/svgs/solid/arrows-left-right.svg?raw";
import playIcon from "@fortawesome/fontawesome-free/svgs/solid/play.svg?raw";
import pauseIcon from "@fortawesome/fontawesome-free/svgs/solid/pause.svg?raw";
import eyeIcon from "@fortawesome/fontawesome-free/svgs/solid/eye.svg?raw";
import penIcon from "@fortawesome/fontawesome-free/svgs/solid/pen.svg?raw";
import trashIcon from "@fortawesome/fontawesome-free/svgs/solid/trash.svg?raw";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Menu, MenuItem, MenuSeparator, NumberStepper, StatusBadge } from "@revolist/ui/react";
import { mountActionBar } from "@revolist/ui/action-bar";
import { ROW_ACTION_COLUMN_WIDTH } from '../../../../composables/row-action';
import { personPortrait } from '../../../../composables/demo-portraits';
import { calendarField } from "../../shared/ui-calendar-field";
import type { ColumnData, ColumnRegular } from "@revolist/revogrid";
import {
  GridPopoverPlugin,
  KeyedRowSelectionPlugin,
  createTimeRangeSlotHeaderFormatter,
  identityCellRenderer,
  statusActionRenderer,
  capacityDotsRenderer,
  metricStackRenderer,
  cellActionRenderer,
} from "@revolist/revogrid-pro";
import { diffInCalendarDays, addDays, parseIsoDate } from "@revolist/ui/dates";
import { renderDateSlotHeader } from "@revolist/revogrid-pro";
import {
  button,
  deleteButton,
  field,
  fixedDate,
  input,
  make,
  matches,
  select,
  personSelect,
  type Example,
} from "../../shared/workbench-ui";

import { crewMembers, initialJobs, type Job, type JobType, type JobStatus, type Entry } from './job-schedule-data';

const dateLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const iso = (day: number) => fixedDate(day).toISOString().slice(0, 10);
const dayText = (day: number) => dateLabel.format(fixedDate(day));
const weekday = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

export const jobSchedule: Example = {
  id: "job-schedule",
  title: "Venue Changeover Schedule",
  description: "Crew assignments for community venue events",
  setup(bench) {
    const jobs = structuredClone(initialJobs);
    let firstDay = 7;
    const type = select(
      "Job type",
      ["All Types", "Lighting", "Audio", "Setup", "Welcome"],
      "All Types",
      () => {
        bench.resetPage();
        refresh();
      },
    );
    const status = select(
      "Show jobs",
      ["All Jobs", "On Track", "Late", "On Hold", "Not Started", "Complete"],
      "All Jobs",
      () => {
        bench.resetPage();
        refresh();
      },
    );
    const earlier = button("Earlier week", () => shift(-7));
    const today = button("Today", () => shift(7 - firstDay));
    const later = button("Later week", () => shift(7));
    earlier.classList.add("job-schedule__week-arrow");
    earlier.textContent = "‹";
    earlier.setAttribute("aria-label", "Earlier week");
    later.classList.add("job-schedule__week-arrow");
    later.textContent = "›";
    later.setAttribute("aria-label", "Later week");
    const weeks = make("div", "", "job-schedule__weeks");
    weeks.setAttribute("role", "group");
    weeks.setAttribute("aria-label", "Weeks");
    weeks.append(earlier, today, later);
    const add = button("Add Job", () => editJob(), true);
    bench.heading.append(weeks, add);
    bench.toolbar.append(type, status);
    const actionHost = make("div", "", "campaign-bulk-host job-bulk-host");
    actionHost.hidden = true;
    bench.toolbar.insertAdjacentElement("afterend", actionHost);
    let selectedIds = new Set<number>();
    const selectedJobs = () => jobs.filter((job) => selectedIds.has(job.id));
    const clearSelection = () => {
      void bench.grid.getPlugins().then((plugins) =>
        plugins.find((plugin) => plugin instanceof KeyedRowSelectionPlugin)?.clear(),
      );
    };
    const actionBar = mountActionBar(actionHost, {
      label: "Selected jobs", count: 0, selectionLabel: "", positioning: { mode: "inline" },
    });
    const canSlide = (day: number, entry: Entry) => day >= 15 && entry.kind !== "done" && entry.kind !== "missed";
    const icon = (paths: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
    function renderSelection() {
      const selected = selectedJobs();
      const active = selected.length > 0;
      actionHost.hidden = !active;
      bench.toolbar.hidden = active;
      const hours = selected.reduce((sum, job) => sum + Object.entries(job.days).reduce(
        (total, [day, entry]) => total + (Number(day) >= 15 && entry.kind === "planned" ? entry.hours ?? 0 : 0), 0,
      ), 0);
      actionBar.update({
        label: "Selected jobs", count: selected.length,
        selectionLabel: `${selected.length} ${selected.length === 1 ? "job" : "jobs"} selected  •  ${hours}h of crew time ahead`,
        positioning: { mode: "inline" },
        actions: [
          { id: "slide", label: "Slide", icon: icon('<path d="M4 7h14m-4-4 4 4-4 4M20 17H6m4-4-4 4 4 4"/>'), disabled: !selected.some(job => Object.entries(job.days).some(([day, entry]) => canSlide(Number(day), entry))) },
          { id: "delete", label: "Delete", icon: icon('<path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v5m4-5v5"/>'), variant: "danger" },
          { id: "clear", label: "Clear" },
        ],
        onAction: (action) => {
          if (action === "clear") { clearSelection(); return; }
          if (action === "delete") {
            const removed = jobs.flatMap((job, index) => selectedIds.has(job.id) ? [{ job, index }] : []);
            for (const { index } of [...removed].reverse()) jobs.splice(index, 1);
            clearSelection(); refresh();
            bench.report(`${removed.length} ${removed.length === 1 ? "job" : "jobs"} deleted.`, () => {
              for (const { job, index } of removed) jobs.splice(Math.min(index, jobs.length), 0, job);
              refresh();
            });
          }
          if (action === "slide") openSlide(selected);
        },
      });
    }
    bench.grid.addEventListener("keyedrowselectionchange", (event) => {
      selectedIds = new Set(event.detail.keys.filter((key): key is number => typeof key === "number"));
      renderSelection();
    });
    bench.onDispose(() => actionBar.destroy());
    bench.onSearch(() => {
      bench.resetPage();
      refresh();
    });
    let columns: ColumnData = makeColumns();
    function shift(amount: number) {
      firstDay += amount;
      columns = makeColumns();
      refresh();
    }
    function visible() {
      const query = bench.currentQuery();
      return jobs.filter(
        (j) =>
          (type.value === "All Types" || j.type === type.value) &&
          (status.value === "All Jobs" || j.status === status.value) &&
          (!query || matches(query, j.label, j.lead, j.street)),
      );
    }
    function refresh() {
      const rows = visible();
      const leadCount = crewMembers.length;
      today.disabled = firstDay === 7;
      bench.setSubtitle(
        `${dayText(firstDay)} to ${dayText(firstDay + 25)}  •  ${rows.length} jobs  •  ${leadCount} crew members`,
      );
      const totals: Record<string, unknown> = {
        id: "crew-load",
        label: "Crew Load",
        footer: true,
        leadCount,
      };
      for (let d = 0; d < 26; d++) {
        const day = firstDay + d;
        const count = new Set(jobs.filter(j => j.days[day]?.hours).map(j => j.lead).filter(Boolean)).size;
        totals[`day-${day}`] = {
          count,
          hours: jobs.reduce((sum, j) => sum + (j.days[day]?.hours ?? 0), 0),
        };
      }
      bench.render(columns, rows, [totals]);
    }
    function openSlide(selected: Job[]) {
      const from = calendarField("From", iso(15));
      let amount = 1;
      const reason = select("Reason", ["Schedule adjustment", "Crew availability", "Event request", "Venue availability"], "Schedule adjustment");
      const preview = make("div", "", "job-slide__preview");
      const warning = make("p", "", "job-slide__warning");
      const move = (day: number, workdays: number) => {
        const direction = Math.sign(workdays);
        let result = day;
        for (let remaining = Math.abs(workdays); remaining > 0;) {
          result += direction;
          const weekday = fixedDate(result).getUTCDay();
          if (weekday !== 0 && weekday !== 6) remaining--;
        }
        return result;
      };
      const changes = () => {
        const offset = amount;
        if (!from.value || !Number.isInteger(offset) || offset === 0 || Math.abs(offset) > 60) return undefined;
        const start = diffInCalendarDays("2026-10-12", from.value);
        return selected.map(job => {
          const entries = Object.entries(job.days).map(([day, entry]) => [Number(day), entry] as const);
          const movable = ([day, entry]: readonly [number, Entry]) => day >= start && entry.kind !== "done" && entry.kind !== "missed";
          const next = entries.map(item => [movable(item) ? move(item[0], offset) : item[0], item[1]] as const);
          const collision = new Set(next.map(([day]) => day)).size !== next.length;
          const crewDays = next.filter(([, entry]) => entry.hours).map(([day]) => day);
          return { job, next, collision, finish: crewDays.length && entries.some(movable) ? dayText(Math.max(...crewDays)) : job.finish };
        });
      };
      function updatePreview() {
        const result = changes();
        preview.replaceChildren();
        if (!result) { warning.textContent = "Choose a start date and a non-zero workday adjustment."; return; }
        for (const item of result) preview.append(make("p", `${item.job.label} · Finish ${item.job.finish} to ${item.finish}`));
        const before = new Map<number, number>();
        const after = new Map<number, number>();
        const selectedJobs = new Map(result.map(item => [item.job.id, item.next]));
        for (const job of jobs) {
          const current = Object.entries(job.days).map(([day, entry]) => [Number(day), entry] as const);
          for (const [day, entry] of current) {
            if (entry.hours) before.set(day, (before.get(day) ?? 0) + entry.hours);
          }
          for (const [day, entry] of selectedJobs.get(job.id) ?? current) {
            if (entry.hours) after.set(day, (after.get(day) ?? 0) + entry.hours);
          }
        }
        const affected = [...new Set([...before.keys(), ...after.keys()])]
          .filter(day => (before.get(day) ?? 0) !== (after.get(day) ?? 0))
          .sort((a, b) => a - b);
        if (affected.length) {
          const table = make("table", "", "job-slide__capacity");
          const caption = make("caption", "Crew hours across all jobs");
          const head = make("thead");
          const headers = make("tr");
          for (const label of ["Day", "Current", "Proposed"]) headers.append(make("th", label));
          head.append(headers);
          const body = make("tbody");
          for (const day of affected) {
            const row = make("tr");
            row.append(make("th", dayText(day)), make("td", `${before.get(day) ?? 0}h`), make("td", `${after.get(day) ?? 0}h`));
            body.append(row);
          }
          table.append(caption, head, body);
          preview.append(table);
        }
        const ids = new Set(selected.map(job => job.id));
        const doubleBooked = result.some(item => item.next.some(([day, entry]) => entry.kind === "planned" && jobs.some(other => !ids.has(other.id) && other.lead === item.job.lead && other.days[day]?.kind === "planned")));
        warning.textContent = result.some(item => item.collision) ? "A moved entry overlaps an existing entry on the same job." : doubleBooked ? "Crew booked twice: check the affected days after the slide." : "";
      }
      from.addEventListener("input", updatePreview);
      from.addEventListener("change", updatePreview);
      const offsetRow = make("div", "", "job-slide__stepper");
      const stepper = createRoot(offsetRow);
      const renderStepper = () => stepper.render(createElement(NumberStepper, {
        label: "Workdays", decreaseLabel: "Decrease workdays", increaseLabel: "Increase workdays",
        value: amount, min: -60, max: 60,
        onChange: (value: number) => { amount = value; renderStepper(); updatePreview(); },
      }));
      renderStepper();
      updatePreview();
      bench.form("Slide Schedule", [make("p", selected.length === 1 ? selected[0].label : `${selected.length} jobs selected`), field("From", from), field("Workdays", offsetRow), make("small", "Below 0 pulls the work in"), field("Reason", reason), make("small", "What moves"), preview, warning], () => {
        const result = changes();
        if (!result || result.some(item => item.collision)) { updatePreview(); return false; }
        const previous = selected.map(job => ({ job, days: structuredClone(job.days), finish: job.finish }));
        for (const item of result) { item.job.days = Object.fromEntries(item.next); item.job.finish = item.finish; }
        clearSelection(); refresh();
        bench.report(`${selected.length} ${selected.length === 1 ? "job" : "jobs"} rescheduled.`, () => {
          for (const { job, days, finish } of previous) { job.days = days; job.finish = finish; }
          refresh();
        });
      }, undefined, "Slide jobs", () => stepper.unmount());
    }
    function openJobMenu(job: Job, anchor: HTMLElement) {
      void bench.grid.getPlugins().then(plugins => {
        const popover = plugins.find(plugin => plugin instanceof GridPopoverPlugin);
        if (!popover || !anchor.isConnected) return;
        const host = make("div");
        const root = createRoot(host);
        const action = (label: string, icon: string, callback: () => void) => createElement(MenuItem, { key: label, onClick: () => { popover.close(); callback(); } }, createElement("span", { className: "job-schedule__menu-icon", "aria-hidden": true, dangerouslySetInnerHTML: { __html: icon } }), label);
        root.render(createElement(Menu, { label: `Actions for ${job.label}` },
          action("Add Crew Day", calendarPlusIcon, () => { const day = firstDay + 8; openDay(job, day, anchor); }),
          action("Slide Schedule", arrowsIcon, () => openSlide([job])),
          action(job.status === "On Hold" ? "Resume Job" : "Put On Hold", job.status === "On Hold" ? playIcon : pauseIcon, () => { const previous = job.status; job.status = job.status === "On Hold" ? "On Track" : "On Hold"; refresh(); bench.report("Job status updated.", () => { job.status = previous; refresh(); }); }),
          createElement(MenuSeparator, { key: "separator" }),
          action("View Job", eyeIcon, () => showJob(job)),
          action("Edit Job", penIcon, () => editJob(job)),
          action("Delete Job", trashIcon, () => { const index = jobs.indexOf(job); if (index < 0) return; jobs.splice(index, 1); refresh(); bench.report("Job deleted.", () => { jobs.splice(Math.min(index, jobs.length), 0, job); refresh(); }); }),
        ));
        popover.open(anchor, { label: `Job menu for ${job.label}`, content: host, align: "end", className: "job-schedule__menu-shell", cleanup: () => root.unmount() });
      });
    }
    function openDay(job: Job, day: number, anchor: HTMLElement) {
      void bench.grid.getPlugins().then((plugins) => {
        const popover = plugins.find((p) => p instanceof GridPopoverPlugin);
        if (!popover || !anchor.isConnected) return;
        const content = make("div", "", "job-schedule__popover");
        const entry = job.days[day];
        content.append(
          make("strong", `${job.label} · ${dayText(day)}`),
          make(
            "p",
            entry
              ? `${entry.note ?? entry.kind}${entry.hours ? ` · ${entry.hours}h crew time` : ""}`
              : "No crew scheduled",
          ),
        );
        const hours = input("Crew hours", String(entry?.hours ?? 8), "number");
        hours.min = "1";
        hours.max = "24";
        content.append(
          field("Crew hours", hours),
          button(entry ? "Update crew day" : "Add crew day", () => {
            const value = Number(hours.value);
            if (!Number.isFinite(value) || value < 1 || value > 24) return;
            job.days[day] = {
              ...entry,
              kind: entry?.kind ?? (day < 15 ? "done" : "planned"),
              hours: value,
            };
            popover.close();
            refresh();
          }),
          ...(entry
            ? [
                deleteButton("Remove", () => {
                  delete job.days[day];
                  popover.close();
                  refresh();
                }),
              ]
            : []),
        );
        popover.open(anchor, {
          label: `Crew day for ${job.label}`,
          content,
          align: "start",
          className: "job-schedule__popover-shell",
        });
      });
    }
    function showJob(job: Job) {
      const content = make("section", "", "job-detail");
      const summary = make("div", "", "job-detail__summary");
      const statusHost = make("span");
      const statusRoot = createRoot(statusHost);
      const tone = job.status === "Late" ? "danger" : job.status === "On Hold" ? "warning" : job.status === "Complete" || job.status === "On Track" ? "success" : "neutral";
      statusRoot.render(createElement(StatusBadge, { label: job.status, tone }));
      summary.append(make("span", job.type, "job-detail__type"), statusHost);
      const heading = make("h3", "Job details");
      const details = make("dl", "", "job-detail__fields");
      for (const [label, value] of [
        ["Location", [job.street, job.town].filter(Boolean).join(", ") || "—"],
        ["Crew lead", job.lead || "Unassigned"],
        ["Planned finish", job.finish || "—"],
        ["Due date", job.due || "—"],
      ]) {
        const item = make("div");
        item.append(make("dt", label), make("dd", value));
        details.append(item);
      }
      const actions = make("div", "", "job-detail__actions");
      actions.append(button("Edit Job", () => editJob(job)));
      content.append(summary, heading, details, actions);
      bench.details(job.label, [content], () => statusRoot.unmount());
    }
    function editJob(job?: Job) {
      const client = input(
        "Event",
        job?.label.replace(/ (Lighting|Audio|Setup|Welcome)$/, "") ?? "",
      );
      const phone = input("Phone", job?.phone ?? "");
      const street = input("Venue", job?.street ?? "");
      const town = input("City", job?.town ?? "");
      const kind = select(
        "Job Type",
        ["Lighting", "Audio", "Setup", "Welcome"],
        job?.type ?? "Lighting",
      );
      const lead = personSelect(
        "Lead",
        crewMembers,
        job?.lead ?? "Maeve Chen",
      );
      const start = calendarField("Start", "2026-10-27");
      const due = calendarField("Due Date", job?.dueDate ?? "");
      client.required = true;
      street.required = true;
      town.required = !job || !!job.town;
      bench.form(
        job ? "Edit Job" : "Add Job",
        [
          make("p", "Crew days are planned from the job type."),
          field("Event", client),
          field("Phone", phone),
          field("Venue", street),
          field("City", town),
          field("Job Type", kind),
          field("Lead", lead),
          ...(!job ? [field("Start", start)] : []),
          field("Due Date", due),
        ],
        () => {
          if (
            !client.value.trim() ||
            !street.value.trim() ||
            (town.required && !town.value.trim())
          )
            return false;
          const target: Job = job ?? {
            id: Math.max(-1, ...jobs.map((j) => j.id)) + 1,
            label: "",
            type: "Lighting" as JobType,
            status: "Not Started" as JobStatus,
            lead: "",
            street: "",
            finish: "Nov 13",
            due: "Nov 13",
            days: {},
          };
          target.label = `${client.value.trim()} ${kind.value}`;
          target.type = kind.value as JobType;
          target.lead = lead.value;
          target.street = street.value;
          target.phone = phone.value.trim();
          target.town = town.value.trim();
          if (due.value) {
            target.dueDate = due.value;
            target.due = dateLabel.format(parseIsoDate(due.value));
          } else if (target.dueDate) {
            target.dueDate = undefined;
            target.due = target.finish;
          }
          if (!job) {
            const plannedStart = start.value || "2026-10-27";
            let date = plannedStart;
            let assigned = 0;
            const plannedDays: Record<JobType, number> = { Lighting: 5, Audio: 4, Setup: 3, Welcome: 5 };
            const duration = plannedDays[target.type];
            while (assigned < duration) {
              const weekday = parseIsoDate(date).getUTCDay();
              if (weekday !== 0 && weekday !== 6) {
                target.days[diffInCalendarDays("2026-10-12", date)] = {
                  kind: "planned",
                  hours: 8,
                };
                assigned++;
              }
              if (assigned < duration) date = addDays(date, 1);
            }
            target.finish = dateLabel.format(parseIsoDate(date));
            target.due = dateLabel.format(parseIsoDate(due.value || date));
            jobs.push(target);
          }
          refresh();
          bench.report(job ? "Job updated." : "Job added.");
        },
        undefined,
        job ? "Save" : "Add Job",
      );
    }
    function makeColumns(): ColumnData {
      const formatHeader = createTimeRangeSlotHeaderFormatter("en");
      const dayColumns: ColumnRegular[] = Array.from(
        { length: 4 },
        (_, week) => ({
          prop: `week-${week}`,
          size: 37,
          dateRangeColumns: {
            start: iso(firstDay + week * 7),
            end: iso(firstDay + week * 7 + 4),
            unit: "day",
            locale: "en",
            prop: (slot) => `day-${firstDay + week * 7 + slot.index}`,
          },
          columnTemplate: (h, column) => {
            const slot = column.dateSlot!,
              parts = formatHeader(slot);
            return renderDateSlotHeader(h, {
              day: parts.day,
              weekday: parts.weekday.slice(0, 2),
              label: slot.label,
              className: "visit-day",
            });
          },
          cellTemplate: (h, props) => props.model.footer
            ? capacityDotsRenderer!(h, props)
            : statusActionRenderer!(h, props),
          capacityDots: {
            format: (_value, model, column) => {
              const slot = column.dateSlot!;
              const day = firstDay + week * 7 + slot.index;
              const load = model[`day-${day}`] as { count: number; hours: number };
              const capacity = Number(model.leadCount);
              const detail = `${load.count} of ${capacity} crew members assigned, ${load.hours}h across jobs`;
              return { value: load.count, capacity, text: `${load.hours}h`, label: `${slot.label}: ${detail}`, tooltip: detail };
            },
          },
          statusAction: {
            format: (_value, model, column) => {
              const slot = column.dateSlot!,
                day = firstDay + week * 7 + slot.index;
              const job = model as Job,
                entry = job.days[day];
              return {
                label: entry
                  ? `${job.label}, ${slot.label}, ${entry.kind}${entry.note ? `, ${entry.note}` : ""}${entry.hours ? `, ${entry.hours}h crew time` : ""}`
                  : `${day < 15 ? "Log" : "Add"} crew day, ${job.label}, ${slot.label}`,
                tooltip: entry && (entry.kind === "delivery" || entry.kind === "inspection") ? (entry.note ?? entry.kind) : undefined,
                text: entry?.kind === "delivery"
                  ? "⬡"
                  : entry?.kind === "inspection"
                    ? "♧"
                    : entry?.hours
                      ? `${entry.hours}h`
                      : "",
                className: `job-schedule__slot job-schedule__slot--${entry?.kind ?? "empty"}`,
                actionClassName: "job-schedule__slot-button",
                hasPopup: "dialog",
              };
            },
            onActivate: (model, event, column) => {
              if (!model.footer)
                openDay(
                  model as Job,
                  firstDay + week * 7 + column.dateSlot!.index,
                  event.currentTarget as HTMLElement,
                );
            },
          },
        }),
      );
      return [
        {
          prop: "label",
          name: "Job",
          size: 230,
          pin: "colPinStart",
          sortable: true,
          cellTemplate: identityCellRenderer,
          identityCell: {
            format: (_value, model) => ({
              label: String(model.label),
              detail: model.footer
                ? `${model.leadCount} crew members across all jobs`
                : String(model.status),
              image: model.footer
                ? undefined
                : personPortrait(String(model.lead)),
              className: `job-schedule__identity ${model.footer ? "is-footer" : `is-${String(model.status).toLowerCase().replaceAll(" ", "-")}`}`,
              actionLabel: `Open ${model.label}`,
            }),
            onActivate: (model) => {
              if (!model.footer) showJob(model as Job);
            },
          },
        },
        ...dayColumns,
        {
          prop: "finish",
          name: "Finish",
          size: 100,
          cellTemplate: (h, props) => props.model.footer ? undefined : metricStackRenderer!(h, props),
          metricStack: { format: (_value, model) => ({ value: String(model.finish), detail: `Due ${model.due}` }) },
        },
        {
          prop: "actions",
        columnChooser: false,
          name: "",
          size: ROW_ACTION_COLUMN_WIDTH,
          cellTemplate: cellActionRenderer,
          cellAction: {
            label: (model) => `Actions for ${model.label}`,
            visible: (model) => !model.footer,
            onActivate: (model, event) => {
              if (!model.footer) openJobMenu(model as Job, event.currentTarget as HTMLElement);
            },
          },
        },
      ];
    }
    refresh();
  },
};
