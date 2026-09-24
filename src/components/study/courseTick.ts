/** The study guides' own tick color per course slug (the Study tab's
 *  header tick and the mistake log). */
const HUES: Record<string, number> = { hist15: 330, cs146: 217, ling112: 282, ling124: 172, ling115: 48, cs154: 200 };
export const courseTick = (slug: string) => ({ backgroundColor: `hsl(${HUES[slug] ?? 200} 60% 60% / 0.9)` });
