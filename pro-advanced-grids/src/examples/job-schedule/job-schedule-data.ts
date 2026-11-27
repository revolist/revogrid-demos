export type JobType = "Lighting" | "Audio" | "Setup" | "Welcome";
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
export const crewMembers = ["Maeve Chen", "Idris Bennett", "Nora Silva", "Theo Mercer", "Amina Okoro", "Ellis Ward", "Lina Costa", "Sanjay Rao", "Avery Brooks", "Marta Voss"];
const names: [
  string,
  JobType,
  JobStatus,
  string,
  string,
  string,
  Record<number, Entry>,
][] = [
  ["Lantern Festival Setup", "Setup", "On Hold", "Maeve Chen", "Nov 10", "Nov 12", {
    18: { kind: "delivery", note: "Lantern frames and rigging" },
    21: { kind: "planned", hours: 5 }, 22: { kind: "planned", hours: 9 },
    25: { kind: "inspection", note: "Rigging review" }, 28: { kind: "planned", hours: 6 },
  }],
  ["Community Gala Lighting", "Lighting", "Not Started", "Idris Bennett", "Nov 19", "Nov 20", {
    28: { kind: "delivery", note: "Lighting consoles" }, 30: { kind: "planned", hours: 7 },
    31: { kind: "planned", hours: 5 }, 35: { kind: "inspection", note: "Lighting safety check" },
  }],
  ["Autumn Market Setup", "Setup", "On Track", "Nora Silva", "Nov 4", "Nov 5", {
    8: { kind: "done", hours: 4 }, 11: { kind: "done", hours: 6 },
    14: { kind: "missed", hours: 5 }, 16: { kind: "planned", hours: 7 },
    18: { kind: "delivery", note: "Stall partitions" }, 22: { kind: "planned", hours: 8 },
    23: { kind: "inspection", note: "Walkway clearance" },
  }],
  ["Jazz Night Audio", "Audio", "On Track", "Theo Mercer", "Nov 6", "Nov 9", {
    10: { kind: "done", hours: 5 }, 14: { kind: "done", hours: 7 },
    17: { kind: "delivery", note: "Stage monitors" }, 18: { kind: "planned", hours: 6 },
    21: { kind: "planned", hours: 4 }, 24: { kind: "inspection", note: "Sound check" },
    25: { kind: "planned", hours: 5 },
  }],
  ["Film Weekend Lighting", "Lighting", "Late", "Amina Okoro", "Nov 2", "Oct 30", {
    7: { kind: "done", hours: 4 }, 9: { kind: "done", hours: 6 },
    11: { kind: "missed", hours: 5 }, 16: { kind: "delivery", note: "Projection lighting" },
    18: { kind: "planned", hours: 7 }, 21: { kind: "planned", hours: 5 },
  }],
  ["Poetry Evening Audio", "Audio", "Not Started", "Ellis Ward", "Nov 17", "Nov 18", {
    29: { kind: "delivery", note: "Lectern microphone" }, 32: { kind: "planned", hours: 4 },
    36: { kind: "inspection", note: "Speech sound check" },
  }],
  ["Youth Showcase Audio", "Audio", "On Track", "Lina Costa", "Nov 11", "Nov 12", {
    11: { kind: "done", hours: 4 }, 14: { kind: "done", hours: 6 },
    18: { kind: "planned", hours: 5 }, 21: { kind: "delivery", note: "Wireless microphones" },
    23: { kind: "planned", hours: 7 }, 28: { kind: "inspection", note: "Stage sound check" },
    30: { kind: "planned", hours: 4 },
  }],
  ["Harvest Fair Setup", "Setup", "Complete", "Sanjay Rao", "Oct 22", "Oct 23", {
    7: { kind: "done", hours: 4 }, 8: { kind: "done", hours: 6 },
    10: { kind: "done", hours: 3 },
  }],
  ["Volunteer Forum Welcome", "Welcome", "On Track", "Avery Brooks", "Nov 3", "Nov 4", {
    8: { kind: "done", hours: 3 }, 14: { kind: "done", hours: 5 },
    16: { kind: "delivery", note: "Signage and lanyards" }, 18: { kind: "planned", hours: 4 },
    22: { kind: "inspection", note: "Accessible entrance review" },
  }],
  ["Winter Concert Audio", "Audio", "Not Started", "Marta Voss", "Nov 23", "Nov 25", {
    32: { kind: "delivery", note: "Choir microphones" }, 35: { kind: "planned", hours: 6 },
    42: { kind: "planned", hours: 5 }, 43: { kind: "inspection", note: "Rehearsal mix" },
  }],
  ["Craft Fair Lighting", "Lighting", "On Track", "Maeve Chen", "Nov 3", "Nov 4", {
    15: { kind: "planned", hours: 5 }, 16: { kind: "delivery", note: "Display lights" }, 21: { kind: "planned", hours: 4 },
  }],
  ["Garden Party Setup", "Setup", "Not Started", "Idris Bennett", "Nov 6", "Nov 9", {
    22: { kind: "delivery", note: "Tables and canopy" }, 23: { kind: "planned", hours: 8 }, 25: { kind: "planned", hours: 6 },
  }],
  ["Storytelling Audio", "Audio", "On Track", "Nora Silva", "Oct 29", "Oct 30", {
    14: { kind: "done", hours: 3 }, 16: { kind: "planned", hours: 5 }, 17: { kind: "inspection", note: "Speech sound check" },
  }],
  ["Dance Night Lighting", "Lighting", "On Hold", "Theo Mercer", "Nov 10", "Nov 12", {
    24: { kind: "delivery", note: "Moving lights" }, 28: { kind: "planned", hours: 8 }, 29: { kind: "planned", hours: 4 },
  }],
  ["Food Drive Welcome", "Welcome", "On Track", "Amina Okoro", "Nov 3", "Nov 4", {
    16: { kind: "planned", hours: 4 }, 21: { kind: "planned", hours: 6 }, 22: { kind: "inspection", note: "Volunteer briefing" },
  }],
  ["Community Concert Lighting", "Lighting", "Late", "Ellis Ward", "Nov 5", "Nov 3", {
    14: { kind: "missed", hours: 4 }, 17: { kind: "planned", hours: 6 }, 24: { kind: "planned", hours: 5 },
  }],
  ["Choral Evening Audio", "Audio", "Not Started", "Lina Costa", "Nov 11", "Nov 12", {
    25: { kind: "delivery", note: "Choir microphones" }, 28: { kind: "planned", hours: 6 }, 30: { kind: "inspection", note: "Rehearsal mix" },
  }],
  ["Open Studios Setup", "Setup", "On Track", "Sanjay Rao", "Nov 4", "Nov 5", {
    15: { kind: "planned", hours: 8 }, 22: { kind: "planned", hours: 7 }, 23: { kind: "inspection", note: "Accessible routes check" },
  }],
  ["Film Premiere Lighting", "Lighting", "Not Started", "Avery Brooks", "Nov 13", "Nov 16", {
    28: { kind: "planned", hours: 6 }, 29: { kind: "delivery", note: "Entrance lighting" }, 32: { kind: "planned", hours: 5 },
  }],
  ["Talk Series Audio", "Audio", "On Track", "Marta Voss", "Nov 6", "Nov 9", {
    17: { kind: "planned", hours: 3 }, 23: { kind: "delivery", note: "Wireless microphones" }, 25: { kind: "planned", hours: 4 },
  }],
  ["Book Festival Setup", "Setup", "Not Started", "Maeve Chen", "Nov 12", "Nov 13", {
    24: { kind: "delivery", note: "Exhibitor tables" }, 29: { kind: "planned", hours: 8 }, 31: { kind: "planned", hours: 6 },
  }],
  ["Charity Auction Lighting", "Lighting", "On Track", "Idris Bennett", "Nov 5", "Nov 6", {
    18: { kind: "planned", hours: 4 }, 23: { kind: "planned", hours: 6 }, 24: { kind: "inspection", note: "Auction floor check" },
  }],
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
    street: ["Riverside Hall", "Northside Arts Centre", "Library Theatre", "Market Pavilion"][id % 4],
  }),
);
