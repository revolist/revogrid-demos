/** Fictional portraits generated for the demo; kept local for reliable previews. */
const portraits = [
  new URL('./portraits/portrait-1.webp', import.meta.url).href,
  new URL('./portraits/portrait-2.webp', import.meta.url).href,
  new URL('./portraits/portrait-3.webp', import.meta.url).href,
  new URL('./portraits/portrait-4.webp', import.meta.url).href,
] as const;

export const demoPortrait = (index: number) => portraits[((index % portraits.length) + portraits.length) % portraits.length];

/** Keep the same demo person recognizable across views. */
export const personPortrait = (name: string) => portraits[[...name].reduce((hash, character) => ((hash * 31 + character.codePointAt(0)!) >>> 0), 0) % portraits.length];
