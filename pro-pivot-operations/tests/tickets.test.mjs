import test from 'node:test';
import assert from 'node:assert/strict';
import { averageResolvedHours, createTickets, summarizeTickets, ticketsInScope } from '../src/tickets.ts';

test('fixture is deterministic, unique, and internally consistent', () => {
  const a = createTickets();
  const b = createTickets();
  assert.deepEqual(a, b);
  assert.equal(a.length, 480);
  assert.equal(new Set(a.map(ticket => ticket['Ticket ID'])).size, 480);
  assert.ok(a.some(ticket => ticket['SLA Status'] === 'Open'));
  assert.ok(a.some(ticket => ticket['SLA Status'] === 'Breached'));
  assert.ok(a.some(ticket => ticket['SLA Status'] === 'Met'));
  for (const ticket of a) {
    assert.equal(ticket['SLA Status'] === 'Open', ticket['Resolved At'] === null);
    assert.equal(ticket['SLA Status'] === 'Breached', ticket['SLA Breach Count'] === 1);
  }
});

test('selected source tickets and displayed summaries have the same scope', () => {
  const tickets = createTickets();
  const selected = ticketsInScope(tickets, { team: 'Payments', priority: 'High' });
  assert.ok(selected.length > 0);
  assert.ok(selected.every(ticket => ticket.Team === 'Payments' && ticket.Priority === 'High'));
  const summary = summarizeTickets(selected);
  assert.equal(summary.count, selected.length);
  assert.equal(summary.open, selected.filter(ticket => ticket['Resolved At'] === null).length);
  assert.equal(summary.breached, selected.filter(ticket => ticket['SLA Status'] === 'Breached').length);
  const resolved = selected.filter(ticket => ticket['Resolution Hours'] !== null);
  assert.equal(summary.averageResolutionHours,
    resolved.reduce((sum, ticket) => sum + ticket['Resolution Hours'], 0) / resolved.length);
});

test('empty and all-open scopes do not invent a resolution average', () => {
  assert.deepEqual(summarizeTickets([]), { count: 0, open: 0, breached: 0, averageResolutionHours: null });
  const open = createTickets().filter(ticket => ticket['SLA Status'] === 'Open');
  assert.equal(summarizeTickets(open).averageResolutionHours, null);
  assert.equal(averageResolvedHours([null, 5, undefined, 15]), 10);
  assert.equal(averageResolvedHours([null, undefined]), undefined);
});
