/** "Fall 2026" <-> "fall-2026" — route slugs for finance term pages. */
export function termSlug(term: string): string {
  return term.toLowerCase().replace(/\s+/g, "-");
}
