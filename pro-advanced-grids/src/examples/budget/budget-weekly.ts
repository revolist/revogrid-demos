import { projectToday } from './budget-schedule.ts';
import type { BudgetParts, BudgetPlan } from './budget-components.ts';

/** Dates are day offsets from 1 August 2026, matching the demo project. */
export interface WeeklyLine {
  id: string;
  start: number;
  plannedEnd: number;
  lineStatus: string;
  plan: BudgetPlan;
  billedParts: BudgetParts;
  leftParts: BudgetParts;
}
export interface WeeklyPoint { day: number; billed: number; ahead: number; line: number | null; }
interface Entry { day: number; kind: 'hours' | 'other'; amount: number; ahead: boolean; id: string; rate: number; }
const epoch = Date.UTC(2026, 7, 1);
const nextFriday = (day: number) => day + (5 - (new Date(epoch + day * 86400000)).getUTCDay() + 7) % 7;
const addMonths = (day: number, count: number) => {
  const date = new Date(epoch + day * 86400000);
  date.setUTCMonth(date.getUTCMonth() + count);
  return Math.round((date.getTime() - epoch) / 86400000);
};
function finish(line: WeeklyLine) {
  if (line.lineStatus === 'done') return line.plannedEnd;
  const duration = line.plannedEnd - line.start;
  const projected = line.plan.hours ? line.start + Math.round(duration * (line.billedParts.hours + line.leftParts.hours) / line.plan.hours) : line.plannedEnd;
  return Math.max(projectToday, projected);
}
function entries(line: WeeklyLine): Entry[] {
  const result: Entry[] = [];
  const add = (day: number, kind: Entry['kind'], amount: number, ahead: boolean) => result.push({ day, kind, amount, ahead, id: line.id, rate: line.plan.rate });
  const { plan, billedParts: billed, leftParts: left } = line;
  if (billed.hours > 0) {
    const limit = Math.min(line.plannedEnd, projectToday), days: number[] = [];
    for (let day = nextFriday(line.start); day <= nextFriday(limit); day += 7) days.push(Math.min(day, limit));
    const seed = Number(line.id.replace(/\D/g, '')) || 0;
    const weights = days.map((_, index) => 1 + .18 * Math.sin(1.7 * seed + 2.1 * index));
    const weight = weights.reduce((sum, value) => sum + value, 0); let assigned = 0;
    days.forEach((day, index) => {
      const hours = Math.max(0, Math.min(index === days.length - 1 ? billed.hours - assigned : Math.round(billed.hours * weights[index] / weight), billed.hours - assigned));
      assigned += hours; if (hours) add(day, 'hours', hours * plan.rate, false);
    });
  }
  if (billed.qty > 0) {
    if (plan.unit === 'mo') for (let index = 0; index < billed.qty; index++) add(addMonths(line.start, index), 'other', plan.price, false);
    else add(line.start, 'other', billed.qty * plan.price, false);
  }
  if (billed.fixed > 0) add(billed.fixed >= plan.fixed && line.plannedEnd <= projectToday ? line.plannedEnd : line.start, 'other', billed.fixed, false);
  const next = nextFriday(projectToday) + 7;
  if (left.hours > 0) {
    const first = Math.max(nextFriday(line.start), next), last = Math.max(nextFriday(finish(line)), first), days: number[] = [];
    for (let day = first; day <= last; day += 7) days.push(day);
    let assigned = 0;
    days.forEach((day, index) => {
      const hours = Math.max(0, Math.min(index === days.length - 1 ? left.hours - assigned : Math.round(left.hours / days.length), left.hours - assigned));
      assigned += hours; if (hours) add(day > finish(line) && finish(line) > projectToday ? finish(line) : day, 'hours', hours * plan.rate, true);
    });
  }
  if (left.qty > 0) {
    const monthly = plan.unit === 'mo';
    for (let index = 0; index < (monthly ? left.qty : 1); index++) add(monthly ? addMonths(line.start, billed.qty + index) : line.start > projectToday ? line.start : next, 'other', (monthly ? 1 : left.qty) * plan.price, true);
  }
  if (left.fixed > 0) add(finish(line) > projectToday ? finish(line) : next, 'other', left.fixed, true);
  return result;
}
export function weeklyBudget(lines: readonly WeeklyLine[], selectedId: string, measure: 'spend' | 'hours') {
  const events = lines.flatMap(entries).map(entry => ({ ...entry, key: nextFriday(entry.day), value: measure === 'spend' ? entry.amount : entry.kind === 'hours' && entry.rate ? entry.amount / entry.rate : 0 }));
  if (!events.length) return { points: [] as WeeklyPoint[], visible: [] as WeeklyPoint[], pace: null as number | null };
  const keys = events.map(event => event.key), first = Math.min(...keys), last = Math.max(...keys);
  const selected = events.filter(event => event.id === selectedId && event.value > 0).map(event => event.key);
  const selectedFirst = Math.min(...selected), selectedLast = Math.max(...selected);
  const points: WeeklyPoint[] = [];
  for (let day = first; day <= last; day += 7) {
    const week = events.filter(event => event.key === day);
    points.push({ day, billed: week.filter(event => !event.ahead).reduce((sum, event) => sum + event.value, 0), ahead: week.filter(event => event.ahead).reduce((sum, event) => sum + event.value, 0), line: selected.length && day >= selectedFirst && day <= selectedLast ? week.filter(event => event.id === selectedId).reduce((sum, event) => sum + event.value, 0) : null });
  }
  const past = points.filter(point => point.day < nextFriday(projectToday));
  const billed = past.reduce((sum, point) => sum + point.billed, 0);
  const index = points.findIndex(point => point.day >= nextFriday(projectToday));
  const start = Math.max(0, Math.min((index < 0 ? points.length : index) - 7, points.length - 16));
  const window = points.slice(start, start + 16), firstActive = Math.max(0, window.findIndex(point => point.billed + point.ahead > 0));
  let lastActive = window.length - 1; while (lastActive > firstActive && window[lastActive].billed + window[lastActive].ahead === 0) lastActive--;
  return { points, visible: window.slice(firstActive, lastActive + 1), pace: past.length && billed ? billed / past.length : null };
}

export interface BurnPoint { day: number; planned: number; actual: number | null; forecast: number | null; }
/** Cumulative weekly plan, billed spend and remaining forecast for a line. */
export function budgetBurn(line: WeeklyLine, near = false) {
  const all = entries(line), first = nextFriday(line.start), plannedEnd = nextFriday(line.plannedEnd), current = nextFriday(projectToday);
  const end = Math.max(plannedEnd, nextFriday(finish(line)), ...all.map(entry => nextFriday(entry.day)));
  const plannedWeeks = Math.floor((plannedEnd - first) / 7) + 1;
  const budget = line.plan.hours * line.plan.rate + line.plan.qty * line.plan.price + line.plan.fixed;
  const points: BurnPoint[] = []; let planned = 0, actual = 0, forecast = 0;
  for (let day = first; day <= end; day += 7) {
    if (day <= plannedEnd && plannedWeeks > 0) planned = Math.min(budget, planned + budget / plannedWeeks);
    actual += all.filter(entry => !entry.ahead && nextFriday(entry.day) === day).reduce((sum, entry) => sum + entry.amount, 0);
    if (day <= current) forecast = actual;
    else forecast += all.filter(entry => entry.ahead && nextFriday(entry.day) === day).reduce((sum, entry) => sum + entry.amount, 0);
    points.push({ day, planned, actual: day <= current ? actual : null, forecast: day >= current ? forecast : null });
  }
  const index = points.findIndex(point => point.day >= current);
  const start = Math.max(0, Math.min((index < 0 ? points.length : index) - 6, points.length - 13));
  return { points, visible: near && points.length > 13 ? points.slice(start, start + 13) : points, current, budget };
}
