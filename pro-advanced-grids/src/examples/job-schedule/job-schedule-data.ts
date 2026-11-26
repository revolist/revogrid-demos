export type JobType = "Kitchen" | "Bath" | "Exterior" | "Basement";
export type JobStatus = "On Hold" | "Not Started" | "On Track" | "Late" | "Complete";
export type Entry = {
  kind: "planned" | "done" | "missed" | "delivery" | "inspection";
  hours?: number;
  note?: string;
};
export type Job = {
  id: number;
  label: string;
  type: JobType;
  status: JobStatus;
  lead: string;
  street: string;
  phone?: string;
  town?: string;
  dueDate?: string;
  finish: string;
  due: string;
  days: Record<number, Entry>;
};
const names: [
  string,
  JobType,
  JobStatus,
  string,
  string,
  string,
  Record<number, Entry>,
][] = [
  [
    "Willow House Exterior",
    "Exterior",
    "On Hold",
    "Maeve Chen",
    "Nov 12",
    "Nov 16",
    {
      21: { kind: "planned", hours: 6 },
      23: { kind: "planned", hours: 7 },
      24: { kind: "delivery", note: "Body paint, 12 gallons" },
      25: { kind: "planned", hours: 12 },
      28: { kind: "planned", hours: 8 },
      29: { kind: "planned", hours: 6 },
      30: { kind: "planned", hours: 8 },
      31: { kind: "planned", hours: 3 },
    },
  ],
  [
    "Oak Street Kitchen",
    "Kitchen",
    "Not Started",
    "Idris Bennett",
    "Dec 1",
    "Dec 4",
    {
      21: { kind: "planned", hours: 10 },
      26: { kind: "planned", hours: 14 },
      27: { kind: "inspection", note: "Electrical rough-in inspection" },
      28: { kind: "planned", hours: 4 },
    },
  ],
  [
    "Harbor House Exterior",
    "Exterior",
    "On Track",
    "Nora Silva",
    "Oct 29",
    "Nov 2",
    {
      8: { kind: "done", hours: 6 },
      10: { kind: "done", hours: 7 },
      11: { kind: "done", hours: 12 },
      14: { kind: "missed", hours: 8 },
      15: { kind: "planned", hours: 6 },
      16: { kind: "planned", hours: 8 },
      17: { kind: "planned", hours: 3 },
    },
  ],
  [
    "Cedar Lane Bath",
    "Bath",
    "On Track",
    "Idris Bennett",
    "Nov 10",
    "Nov 12",
    {
      14: { kind: "done", hours: 10 },
      15: { kind: "planned", hours: 11 },
      16: { kind: "inspection", note: "Plumbing rough-in inspection" },
      17: { kind: "planned", hours: 4 },
      18: { kind: "planned", hours: 9 },
      22: { kind: "planned", hours: 7 },
      23: { kind: "planned", hours: 9 },
      24: { kind: "planned", hours: 5 },
      25: { kind: "planned", hours: 7 },
      26: { kind: "planned", hours: 7 },
    },
  ],
  [
    "Maple Court Kitchen",
    "Kitchen",
    "Late",
    "Maeve Chen",
    "Nov 3",
    "Oct 29",
    {
      7: { kind: "done", hours: 6 },
      8: { kind: "done", hours: 10 },
      9: { kind: "done", hours: 8 },
      10: { kind: "done", hours: 2 },
      15: { kind: "delivery", note: "Quartz slab, 2 pieces" },
      16: { kind: "delivery", note: "Subway backsplash tile" },
      17: { kind: "planned", hours: 7 },
      18: { kind: "planned", hours: 6 },
      21: { kind: "planned", hours: 11 },
      22: { kind: "planned", hours: 4 },
      23: { kind: "inspection", note: "Final inspection" },
    },
  ],
  [
    "Orchard House Bath",
    "Bath",
    "Not Started",
    "Maeve Chen",
    "Nov 23",
    "Nov 26",
    {
      23: { kind: "planned", hours: 6 },
      24: { kind: "delivery", note: "Shower valve and trim" },
      28: { kind: "planned", hours: 12 },
    },
  ],
  [
    "Pine Terrace Bath",
    "Bath",
    "On Track",
    "Idris Bennett",
    "Nov 9",
    "Nov 11",
    {
      11: { kind: "done", hours: 7 },
      14: { kind: "done", hours: 13 },
      15: { kind: "inspection", note: "Plumbing rough-in inspection" },
      16: { kind: "planned", hours: 6 },
      17: { kind: "planned", hours: 6 },
      18: { kind: "delivery", note: "Hex floor tile" },
      21: { kind: "planned", hours: 9 },
      22: { kind: "planned", hours: 6 },
      23: { kind: "planned", hours: 7 },
      24: { kind: "planned", hours: 9 },
      25: { kind: "planned", hours: 4 },
      26: { kind: "planned", hours: 5 },
    },
  ],
  [
    "Birch Exterior",
    "Exterior",
    "Complete",
    "Nora Silva",
    "Oct 19",
    "Oct 20",
    { 7: { kind: "done", hours: 3 } },
  ],
  [
    "Alder Basement",
    "Basement",
    "On Track",
    "Maeve Chen",
    "Oct 29",
    "Nov 3",
    {
      7: { kind: "done", hours: 10 },
      8: { kind: "done", hours: 8 },
      9: { kind: "done", hours: 4 },
      11: { kind: "done", hours: 7 },
      14: { kind: "done", hours: 7 },
      15: { kind: "planned", hours: 10 },
      16: { kind: "planned", hours: 7 },
      17: { kind: "planned", hours: 2 },
      18: { kind: "inspection", note: "Final inspection" },
    },
  ],
  [
    "Cypress Bath",
    "Bath",
    "Not Started",
    "Idris Bennett",
    "Nov 24",
    "Nov 26",
    {
      24: { kind: "planned", hours: 9 },
      25: { kind: "delivery", note: "Shower valve and trim" },
    },
  ],
  ...[
    "Ash Kitchen",
    "Birchwood Exterior",
    "Clover Bath",
    "Dune Kitchen",
    "Elm Basement",
    "Mason Kitchen",
    "Nightingale Bath",
    "Plover Exterior",
    "Rowan Kitchen",
    "Stone Bath",
    "Timber Exterior",
    "Vale Kitchen",
  ].map(
    (name, i) =>
      [
        name,
        name.split(" ")[1] as JobType,
        (name.startsWith("Mason") ? "Late" : "On Track") as JobStatus,
        i % 2 ? "Maeve Chen" : "Idris Bennett",
        "Nov 12",
        "Nov 16",
        { [15 + (i % 5)]: { kind: "planned", hours: 7 } },
      ] as [
        string,
        JobType,
        JobStatus,
        string,
        string,
        string,
        Record<number, Entry>,
      ],
  ),
];
export const initialJobs: Job[] = names.map(
  ([label, type, status, lead, finish, due, days], id) => ({
    id,
    label,
    type,
    status,
    lead,
    finish,
    due,
    days,
    street: `${210 + id * 17} ${["Birch Avenue", "Harbor Road", "Cedar Street", "Elm Lane"][id % 4]}`,
  }),
);
