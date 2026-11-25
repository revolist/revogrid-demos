import assert from 'node:assert/strict';
import test from 'node:test';
import { initialKitchens, initialVisits } from './visit-fixtures.ts';
import { coverage, dueVisits, effectiveStatus, serviceStates } from './visit-model.ts';

test('service schedule ranks the full contracts independently of the visible window', () => {
  const ranked = initialKitchens.map(kitchen => ({ kitchen, result: coverage(serviceStates(kitchen, initialVisits)) }))
    .sort((a,b) => a.result.rank - b.result.rank || a.kitchen.label.localeCompare(b.kitchen.label));
  assert.deepEqual(ranked.slice(0, 10).map(({kitchen}) => kitchen.label), ['Orchard Hearth', 'Canyon Taco House', 'Garden Row Grill', 'Juniper Café', 'Elm Street Café', 'Meadow Taco House', 'Beacon Pizza Co.', 'Copper Pot Kitchen', 'Willowwood Grill', 'Alder Table']);
  assert.deepEqual(ranked.slice(0, 5).map(({result}) => [result.onTrack, result.total, result.important.state]), [[3,6,'gap'],[4,6,'missed'],[4,6,'missed'],[3,4,'missed'],[3,4,'gap']]);
  assert.deepEqual(dueVisits(ranked[0].kitchen, initialVisits, serviceStates(ranked[0].kitchen, initialVisits)).map(v => [v.service, v.day]), [['pest',9],['fire',16]]);
});

test('bookings, completed visits and weekday collisions update coverage and due slots', () => {
  const kitchen = { id: 1, label: 'Test', manager: 'Manager', volume: 'high', services: ['pest', 'grease'], priorDone: { pest: -20, grease: -50 } };
  const old = { kitchen: 1, service: 'pest', day: 0, status: 'Booked', crew: '', report: '' };
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
  const { bookingError, suggestCrew } = await import('./visit-model.ts');
  const { technicians } = await import('./visit-fixtures.ts');
  const kitchens = [{ id: 1, label: 'A', manager: 'M', volume: 'high', services: ['pest', 'grease'], priorDone: {} }, { id: 2, label: 'B', manager: 'M', volume: 'high', services: ['pest'], priorDone: {} }];
  const visit = { kitchen: 1, day: 8, service: 'pest', status: 'Awaiting', crew: 'Zara Nwosu', report: '', window: 'opening' };
  assert.match(bookingError({...visit, day:9}, kitchens, [visit], technicians), /open visit/);
  assert.match(bookingError({...visit, service:'grease', crew:'Mateo Silva'}, kitchens, [visit], technicians), /already has a visit/);
  assert.match(bookingError({...visit, kitchen:2}, kitchens, [visit], technicians), /Zara Nwosu is at A/);
  assert.match(bookingError({...visit, kitchen:2, crew:'Mateo Silva'}, kitchens, [visit], technicians), /certified/);
  assert.match(bookingError({...visit, kitchen:2, day:3}, kitchens, [], technicians), /today or a later day/);
  const suggestion = suggestCrew('pest', 8, [visit], technicians);
  assert.equal(suggestion.window, 'opening');
  assert.equal(suggestion.crew, 'Nora Ellis');
  assert.equal(bookingError({...visit, kitchen:2, ...suggestion}, kitchens, [visit], technicians), null);
});

test('kitchen contracts require unique names, managers and a service with past last-done dates', async () => {
  const { kitchenError } = await import('./visit-model.ts');
  const draft = { id: 3, label: 'New Kitchen', address: '123 Main St', manager: 'Grace Okoye', volume: 'high', services: ['hood'], priorDone: { hood: -80 } };
  assert.equal(kitchenError(draft, initialKitchens, ['Grace Okoye']), null);
  assert.equal(serviceStates(draft, [])[0].due, 10);
  assert.match(kitchenError({ ...draft, label: ' orchard hearth ' }, initialKitchens, ['Grace Okoye']), /already has this name/);
  assert.match(kitchenError({ ...draft, services: [] }, initialKitchens, ['Grace Okoye']), /at least one service/);
  assert.match(kitchenError({ ...draft, priorDone: { hood: 5 } }, initialKitchens, ['Grace Okoye']), /future/);
  assert.match(kitchenError({ ...draft, address: '' }, initialKitchens, ['Grace Okoye']), /address/);
});

test('kitchen plan derives last completions and upcoming visits from the complete fixture', async () => {
  const { kitchenPlan } = await import('./visit-model.ts');
  const kitchen = initialKitchens.find(item => item.label === 'Orchard Hearth');
  const plan = kitchenPlan(kitchen, initialVisits);
  assert.deepEqual(plan.map(({ service, lastDone, due, state, next }) => [service, lastDone, due, state, next?.day]), [
    ['clean', -4, 10, 'late', 14], ['pest', -21, 9, 'gap', undefined], ['grease', -52, 8, 'ok', 8],
    ['hood', -33, 57, 'clear', undefined], ['fridge', -45, 45, 'clear', undefined], ['fire', -164, 16, 'gap', undefined],
  ]);
});

test('newer contract completion overrides older logged visits in plan and coverage', async () => {
  const { kitchenPlan } = await import('./visit-model.ts');
  const kitchen = { id: 901, label: 'Test', manager: 'Manager', volume: 'high', services: ['pest'], priorDone: { pest: 3 } };
  const visits = [{ kitchen: 901, service: 'pest', day: -10, status: 'Completed', crew: '', report: '' }];
  assert.equal(serviceStates(kitchen, visits)[0].due, 33);
  assert.equal(kitchenPlan(kitchen, visits)[0].lastDone, 3);
});

test('a missed visit is not presented as an upcoming booking', async () => {
  const { kitchenPlan } = await import('./visit-model.ts');
  const kitchen = { id: 902, label: 'Test', manager: 'Manager', volume: 'high', services: ['pest'], priorDone: { pest: -50 } };
  const missed = { kitchen: 902, service: 'pest', day: 7, status: 'Missed', crew: '', report: '' };
  const planned = { ...missed, day: 8, status: 'Booked' };
  assert.equal(serviceStates(kitchen, [missed, planned])[0].state, 'late');
  assert.equal(kitchenPlan(kitchen, [missed, planned])[0].next, planned);
});
