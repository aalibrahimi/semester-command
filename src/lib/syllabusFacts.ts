/**
 * syllabusFacts — plain-regex mining of extracted syllabus text.
 *
 * One parser shared by every page that surfaces syllabus knowledge
 * (Contacts, CourseDetail), so a course's office hours read identically
 * everywhere. Transparent by design: callers label results "from syllabus",
 * never pretending Canvas confirmed them. Grew out of Contacts' inline
 * extractContact when CourseDetail needed the same facts plus policies.
 */

export interface SyllabusFacts {
  emails: string[];
  phones: string[];
  officeHours: string | null;
  latePolicy: string | null;
  makeupPolicy: string | null;
}

/** First line matching `re` that is long enough to mean something and short
 *  enough to display. PDF extraction yields ragged lines; a sentence-length
 *  window beats trying to reassemble paragraphs. */
function findLine(lines: string[], re: RegExp, maxLen = 260): string | null {
  return lines.find((l) => re.test(l) && l.length > 12 && l.length < maxLen) ?? null;
}

export function extractFacts(text: string): SyllabusFacts {
  const emails = [...new Set(text.match(/[\w.+-]+@[\w-]+\.[\w.-]+[a-z]/gi) ?? [])].slice(0, 4);
  const phones = [
    ...new Set(text.match(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g) ?? []),
  ].slice(0, 3);

  const lines = text.split("\n").map((l) => l.trim());

  return {
    emails,
    phones,
    officeHours: findLine(lines, /office\s*hours?/i, 200),
    latePolicy: findLine(
      lines,
      /late\s+(work|polic|submission|assignment|homework)|no\s+late\s|late\s+penalt|submitted\s+late|accepted\s+late/i,
    ),
    makeupPolicy: findLine(lines, /make[\s-]?up\s+(exam|quiz|test|work|polic)|missed\s+(exam|quiz|test)/i),
  };
}
