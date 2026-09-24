/**
 * useCourseData: one study course's progress and its plan (what to read,
 * drill or recall next). Shared by the Study course page and the course
 * page's Overview tab.
 */
import { useEffect, useState } from "react";
import type { Course } from "@/study/types";
import type { Guide } from "@/study/guide";
import { attemptsRecent, examsRecent, reviewsAll, sectionsAll } from "@/study/mastery";
import { plan, type Action } from "@/study/plan";
import { courseProgress, type CourseProgress } from "@/study/progress";

/** Progress and the plan, for this one course. */
export function useCourseData(c: Course | undefined, guides: Guide[]): { prog: CourseProgress | null; actions: Action[] } {
  const [state, setState] = useState<{ prog: CourseProgress | null; actions: Action[] }>({ prog: null, actions: [] });
  useEffect(() => {
    if (!c) return;
    let alive = true;
    void Promise.all([sectionsAll(), attemptsRecent(2000), reviewsAll(), examsRecent()]).then(([sections, attempts, reviews, exams]) => {
      if (!alive) return;
      const prog = courseProgress(guides, sections);
      const actions = plan({ courses: [c], guidesByCourse: { [c.slug]: guides }, sections, attempts, reviews, exams }, 4);
      setState({ prog, actions });
    });
    return () => {
      alive = false;
    };
  }, [c, guides]);
  return state;
}
