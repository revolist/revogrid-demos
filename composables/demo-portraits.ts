/** Portraits already used by the project-table demo. */
const portraits = [
  'https://randomuser.me/api/portraits/women/2.jpg',
  'https://randomuser.me/api/portraits/men/3.jpg',
  'https://randomuser.me/api/portraits/women/4.jpg',
  'https://randomuser.me/api/portraits/men/5.jpg',
] as const;

export const demoPortrait = (index: number) => portraits[((index % portraits.length) + portraits.length) % portraits.length];

/** Keep the same demo person recognizable across views. */
const peoplePortraits = [
  ...portraits,
  'https://randomuser.me/api/portraits/men/1.jpg',
  'https://randomuser.me/api/portraits/women/5.jpg',
  'https://randomuser.me/api/portraits/men/6.jpg',
  'https://randomuser.me/api/portraits/women/6.jpg',
  'https://randomuser.me/api/portraits/men/7.jpg',
  'https://randomuser.me/api/portraits/women/7.jpg',
  'https://randomuser.me/api/portraits/men/8.jpg',
  'https://randomuser.me/api/portraits/women/8.jpg',
  'https://randomuser.me/api/portraits/men/9.jpg',
  'https://randomuser.me/api/portraits/women/9.jpg',
  'https://randomuser.me/api/portraits/men/10.jpg',
] as const;
export const personPortrait = (name: string) => peoplePortraits[[...name].reduce((hash, character) => ((hash * 31 + character.codePointAt(0)!) >>> 0), 0) % peoplePortraits.length];
