import assert from 'node:assert/strict';
import test from 'node:test';
import { facilityManagers, facilitySites, facilityTechnicians, facilityVisits } from './facility-fixtures.ts';
import { services } from './visit-model.ts';

test('facilities have unique contracts and qualified, conflict-free sample visits', () => {
  assert.equal(new Set(facilitySites.map(site => site.id)).size, facilitySites.length);
  assert.equal(new Set(facilitySites.map(site => site.label)).size, facilitySites.length);
  const occupied = new Set();
  for (const site of facilitySites) {
    assert.ok(facilityManagers.includes(site.manager));
    assert.ok(site.address && site.services.length);
    assert.ok(site.services.every(service => services[service]));
  }
  for (const visit of facilityVisits) {
    const site = facilitySites.find(item => item.id === visit.kitchen);
    assert.ok(site?.services.includes(visit.service));
    assert.ok(facilityTechnicians.some(person => person.name === visit.crew && person.service === visit.service));
    const slot = `${visit.crew}:${visit.day}:${visit.window}`;
    assert.ok(!occupied.has(slot), `Conflicting technician slot: ${slot}`);
    occupied.add(slot);
  }
});
