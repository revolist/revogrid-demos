import type { Kitchen, Service, Technician, Visit } from './visit-model';

export const facilityManagers = ['Inez Ward', 'Malik Shah', 'Rosa Li', 'Theo Martin'] as const;
export const facilityTechnicians: Technician[] = [
  { name: 'Ada Ortiz', service: 'air' }, { name: 'Leah Moon', service: 'air' },
  { name: 'Samir Shah', service: 'water' }, { name: 'Mara Ellis', service: 'water' },
  { name: 'Finn Doyle', service: 'electrical' }, { name: 'Lina Cho', service: 'electrical' },
  { name: 'Pavel Novak', service: 'lift' }, { name: 'Jo Silva', service: 'lift' },
  { name: 'Amina Reed', service: 'fire' }, { name: 'Tariq Moss', service: 'fire' },
  { name: 'Nora Vale', service: 'climate' }, { name: 'Kai Ford', service: 'climate' },
];

const sites = [
  ['Harbor Learning Centre', '18 Harbor Walk'], ['Willow Public Library', '44 Willow Lane'],
  ['Northside Pool', '6 North Street'], ['Riverside Arts Hall', '71 River Road'],
  ['Cedar Community Hub', '22 Cedar Avenue'], ['Market Street Library', '8 Market Street'],
  ['Hilltop Sports Centre', '90 Hill Road'], ['Orchard Youth Centre', '12 Orchard Place'],
  ['Eastgate Health Hub', '31 Eastgate Road'], ['Brookside Workshop', '4 Brook Street'],
  ['Mosaic Music Hall', '60 Station Road'], ['Westfield Community Pool', '2 Westfield Way'],
] as const;
const keys: Service[] = ['air', 'water', 'electrical', 'lift', 'fire', 'climate'];

/** Facilities and their independent maintenance histories, adapted to the scheduler model. */
export const facilitySites: Kitchen[] = sites.map(([label, address], id) => ({
  id, label, address, manager: facilityManagers[id % facilityManagers.length],
  volume: id % 3 === 0 ? 'high' : 'moderate',
  services: keys.filter((_, index) => index < 3 || (id + index) % 3 !== 0),
  priorDone: Object.fromEntries(keys.map((key, index) => [key, -[3, 11, 25, 48, 70, 30][index] - (id * 7 + index * 3) % 18])),
}));

export const facilityVisits: Visit[] = facilitySites.flatMap((site, index) => {
  const service = site.services[index % site.services.length];
  const crew = facilityTechnicians.find(person => person.service === service)!.name;
  return [
    { kitchen: site.id, day: -18 - index, service, status: 'Completed' as const, crew, report: `FM-${2100 + index}`, window: 'afternoon' as const, notes: 'Inspection recorded and site team notified.' },
    { kitchen: site.id, day: index < 4 ? index : 6 + index, service, status: index % 3 === 0 ? 'Awaiting' as const : 'Booked' as const, crew, report: '', window: 'afternoon' as const, notes: '' },
  ];
});
