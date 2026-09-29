/**
 * lectureQueue: lecture files from Canvas joined with the study chapters,
 * so every screen can ask "what was posted that has no chapter yet?".
 *
 * Called by: routes/StudyLectures.tsx, routes/StudyCourse.tsx, Today.
 * Calls: ipc lectureFilesList, hooks/useCourses (Canvas course codes),
 * study/loadGuides (chapter summaries), study/lectureCoverage.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { IS_TAURI, lectureFilesList, type LectureFileRow } from "@/lib/ipc";
import { useCourses } from "@/hooks/useCourses";
import { summariesForCourse, useGuideIndexVersion } from "./loadGuides";
import { coveringGuide, lectureRef, studyCourseForCode } from "./lectureCoverage";
import type { Course } from "./types";

export type LectureStatus = "covered" | "waiting" | "hidden";

export interface LectureItem {
  row: LectureFileRow;
  course: Course | undefined;
  /** Canvas course code, for courses the Study area doesn't know. */
  courseCode: string | null;
  status: LectureStatus;
  /** The chapter that covers it, when status is "covered". */
  guideId?: string;
  /** "Lecture 12", "Week 7", or null. */
  label: string | null;
}

/** A message to paste to Claude asking for the chapter. */
export function chapterRequest(it: LectureItem): string {
  const code = it.course?.code ?? it.courseCode ?? "this course";
  const posted = it.row.createdAt ? ` (posted ${new Date(it.row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })})` : "";
  return `Please write the study chapter for ${code}: "${it.row.name}"${posted}. It's on Canvas (course ${it.row.courseId}, file ${it.row.fileId}). Same format as the other ${code} chapters: from zero, figures, code + animation where it helps, drills.`;
}

export function useLectureQueue() {
  const { courses } = useCourses();
  const v = useGuideIndexVersion();
  const [rows, setRows] = useState<LectureFileRow[] | null>(IS_TAURI ? null : []);

  const refresh = useCallback(async () => {
    try {
      setRows(await lectureFilesList());
    } catch {
      /* keep what we had */
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line set-state-in-effect -- reading the Rust store
    void refresh();
    if (!IS_TAURI) return;
    const un = import("@tauri-apps/api/event").then(({ listen }) => listen("sync:status-changed", () => void refresh()));
    return () => void un.then((f) => f());
  }, [refresh]);

  const items = useMemo<LectureItem[]>(() => {
    const codeOf = new Map(courses.map((c) => [c.id, c.courseCode]));
    return (rows ?? []).map((row) => {
      const courseCode = codeOf.get(row.courseId) ?? null;
      const course = studyCourseForCode(courseCode);
      const ref = lectureRef(row.name);
      const guides = course ? summariesForCourse(course.slug, course.guides) : [];
      const guideId = coveringGuide(ref, guides);
      const status: LectureStatus = row.dismissed ? "hidden" : guideId ? "covered" : "waiting";
      return { row, course, courseCode, status, guideId, label: ref ? `${ref.kind === "week" ? "Week" : "Lecture"} ${ref.n}` : null };
    });
    // v: re-join when new chapters arrive from the content cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, courses, v]);

  return { items, loaded: rows !== null, refresh, waiting: items.filter((i) => i.status === "waiting") };
}
