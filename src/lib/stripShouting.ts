/**
 * stripShouting — "[REQUIRED] Homework 1" → clean title + the shouted flags.
 *
 * Canvas assignment names arrive yelling; the UI demotes the brackets to
 * quiet chips. Shared home for the copies that grew in Triage and
 * CourseDetail (they still carry local versions; new code imports this).
 */
export function stripShouting(name: string | null): { title: string; flags: string[] } {
  const raw = name ?? "Untitled";
  const flags: string[] = [];
  const title = raw
    .replace(/\[([A-Z][A-Z !]{2,})\]/g, (_, f: string) => {
      flags.push(f.trim().toLowerCase());
      return "";
    })
    .replace(/\s{2,}/g, " ")
    .trim();
  return { title: title || raw, flags };
}
