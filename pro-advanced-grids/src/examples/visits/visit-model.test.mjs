import assert from 'node:assert/strict';
import test from 'node:test';
import { facilitySites as initialKitchens, facilityVisits as initialVisits, facilityTechnicians as technicians } from './facility-fixtures.ts';
import { coverage, dueVisits, effectiveStatus, serviceStates } from './visit-model.ts';

test('service schedule ranks the full contracts independently of the visible window', () => {
  const ranked = initialKitchens.map(kitchen => ({ kitchen, result: coverage(serviceStates(kitchen, initialVisits)) }))
    .sort((a,b) => a.result.rank - b.result.rank || a.kitchen.label.localeCompare(b.kitchen.label));
  assert.equal(ranked[0].kitchen.label, 'Riverside Arts Hall');
  assert.deepEqual([ranked[0].result.onTrack, ranked[0].result.total, ranked[0].result.important.state], [1, 5, 'missed']);
  assert.deepEqual(dueVisits(ranked[0].kitchen, initialVisits, serviceStates(ranked[0].kitchen, initialVisits)).map(v => [v.service, v.day]), [['air', 8], ['water', 11], ['electrical', 25]]);
});

test('bookings, completed visits and weekday collisions update coverage and due slots', () => {
  const kitchen = { id: 1, label: 'Test', manager: 'Manager', volume: 'high', services: ['water', 'electrical'], priorDone: { water: -20, electrical: -50 } };
  const old = { kitchen: 1, service: 'water', day: 0, status: 'Booked', crew: '', report: '' };
  assert.equal(effectiveStatus(old), 'Missed');
  assert.equal(serviceStates(kitchen, [old])[0].state, 'missed');
  const completed = { ...old, day: 2, status: 'Completed' };
  assert.equal(serviceStates(kitchen, [old, completed])[0].state, 'gap');
  const due = dueVisits(kitchen, [old, completed], serviceStates(kitchen, [old, completed]));
  assert.notEqual(due[0].day, due[1].day);
  const booked = { ...due[0], status: 'Booked' };
  assert.ok(['ok', 'late'].includes(serviceStates(kitchen, [old, completed, booked]).find(s => s.service === booked.service).state));
});

test('booking rejects conflicting services, days and technicians and suggests an available crew', async () => {
  const { bookingError, suggestCrew, technicianConflict } = await import('./visit-model.ts');
  const kitchens = [{ id: 1, label: 'A', manager: 'M', volume: 'high', services: ['water', 'electrical'], priorDone: {} }, { id: 2, label: 'B', manager: 'M', volume: 'high', services: ['water'], priorDone: {} }];
  const visit = { kitchen: 1, day: 8, service: 'water', status: 'Awaiting', crew: 'Samir Shah', report: '', window: 'opening' };
  assert.equal(technicianConflict('Samir Shah', 8, 'opening', [visit]), visit);
  assert.equal(technicianConflict('Samir Shah', 8, 'opening', [visit], visit), undefined);
  assert.equal(technicianConflict('Samir Shah', 8, 'close', [visit]), undefined);
  assert.match(bookingError({...visit, day:9}, kitchens, [visit], technicians), /open visit/);
  assert.match(bookingError({...visit, service:'electrical', crew:'Finn Doyle'}, kitchens, [visit], technicians), /already has a visit/);
  assert.match(bookingError({...visit, kitchen:2}, kitchens, [visit], technicians), /Samir Shah is at A/);
  assert.match(bookingError({...visit, kitchen:2, crew:'Finn Doyle'}, kitchens, [visit], technicians), /certified/);
  assert.match(bookingError({...visit, kitchen:2, day:3}, kitchens, [], technicians), /today or a later day/);
  const suggestion = suggestCrew('water', 8, [visit], technicians);
  assert.equal(suggestion.window, 'opening');
  assert.equal(suggestion.crew, 'Mara Ellis');
  assert.equal(bookingError({...visit, kitchen:2, ...suggestion}, kitchens, [visit], technicians), null);
});

test('kitchen contracts require unique names, managers and a service with past last-done dates', async () => {
  const { kitchenError } = await import('./visit-model.ts');
  const draft = { id: 3, label: 'New Kitchen', address: '123 Main St', manager: 'Inez Ward', volume: 'high', services: ['lift'], priorDone: { lift: -80 } };
  assert.equal(kitchenError(draft, initialKitchens, ['Inez Ward']), null);
  assert.equal(serviceStates(draft, [])[0].due, 10);
  assert.match(kitchenError({ ...draft, label: ' harbor learning centre ' }, initialKitchens, ['Inez Ward']), /already has this name/);
  assert.match(kitchenError({ ...draft, services: [] }, initialKitchens, ['Inez Ward']), /at least one service/);
  assert.match(kitchenError({ ...draft, priorDone: { lift: 5 } }, initialKitchens, ['Inez Ward']), /future/);
  assert.match(kitchenError({ ...draft, address: '' }, initialKitchens, ['Inez Ward']), /address/);
});

test('kitchen plan derives last completions and upcoming visits from the complete fixture', async () => {
  const { kitchenPlan } = await import('./visit-model.ts');
  const kitchen = initialKitchens.find(item => item.label === 'Harbor Learning Centre');
  const plan = kitchenPlan(kitchen, initialVisits);
  assert.deepEqual(plan.map(({ service, lastDone, due, state, next }) => [service, lastDone, due, state, next?.day]), [
    ['air', -3, 11, 'missed', 0], ['water', -14, 16, 'gap', undefined], ['electrical', -31, 29, 'gap', undefined],
    ['fire', -82, 98, 'clear', undefined], ['climate', -45, 45, 'clear', undefined],
  ]);
});

test('newer contract completion overrides older logged visits in plan and coverage', async () => {
  const { kitchenPlan } = await import('./visit-model.ts');
  const kitchen = { id: 901, label: 'Test', manager: 'Manager', volume: 'high', services: ['water'], priorDone: { water: 3 } };
  const visits = [{ kitchen: 901, service: 'water', day: -10, status: 'Completed', crew: '', report: '' }];
  assert.equal(serviceStates(kitchen, visits)[0].due, 33);
  assert.equal(kitchenPlan(kitchen, visits)[0].lastDone, 3);
});

test('a missed visit is not presented as an upcoming booking', async () => {
  const { kitchenPlan } = await import('./visit-model.ts');
  const kitchen = { id: 902, label: 'Test', manager: 'Manager', volume: 'high', services: ['water'], priorDone: { water: -50 } };
  const missed = { kitchen: 902, service: 'water', day: 7, status: 'Missed', crew: '', report: '' };
  const planned = { ...missed, day: 8, status: 'Booked' };
  assert.equal(serviceStates(kitchen, [missed, planned])[0].state, 'late');
  assert.equal(kitchenPlan(kitchen, [missed, planned])[0].next, planned);
});

test('bulk booking skips conflicts and checks earlier planned bookings', async () => {
  const { planDueBookings } = await import('./visit-model.ts');
  const kitchens = [1, 2, 3, 4, 5].map(id => ({ id, label: `Kitchen ${id}`, manager: 'M', volume: 'high', services: ['water', 'electrical'], priorDone: {} }));
  const technicians = [{ name: 'Pest technician', service: 'water' }, { name: 'Grease technician', service: 'electrical' }];
  const due = (kitchen, service = 'water') => ({ kitchen, day: 8, service, status: 'Due', crew: '', report: '' });
  const occupied = ['opening', 'afternoon', 'close'].map((window, index) => ({ ...due(index + 1), status: 'Booked', crew: 'Pest technician', window }));
  const full = planDueBookings([due(4)], kitchens, occupied, technicians);
  assert.equal(full.bookings.length, 0);
  assert.match(full.skipped[0].reason, /Pick another time or technician/);
  const partial = planDueBookings([due(1, 'electrical'), due(1, 'water'), due(2, 'water'), due(3, 'water'), due(4, 'water'), due(5, 'water')], kitchens, [], technicians);
  assert.equal(partial.bookings.length, 4);
  assert.equal(partial.skipped.length, 2);
  assert.match(partial.skipped[0].reason, /already has a visit/);
  assert.match(partial.skipped[1].reason, /Pick another time or technician/);
  assert.deepEqual(partial.bookings.filter(visit => visit.service === 'water').map(visit => visit.window), ['opening', 'afternoon', 'close']);
});

test('bulk booking rejects stale duplicate services and missing qualified crew', async () => {
  const { planDueBookings } = await import('./visit-model.ts');
  const kitchen = { id: 1, label: 'Test', manager: 'M', volume: 'high', services: ['water', 'electrical'], priorDone: {} };
  const due = { kitchen: 1, day: 8, service: 'water', status: 'Due', crew: '', report: '' };
  const previous = { ...due, day: 7, status: 'Booked', crew: 'Pest technician', window: 'opening' };
  assert.match(planDueBookings([due], [kitchen], [previous], [{ name: 'Pest technician', service: 'water' }]).skipped[0].reason, /open visit/);
  assert.match(planDueBookings([{ ...due, service: 'electrical' }], [kitchen], [], []).skipped[0].reason, /certified/);
});
