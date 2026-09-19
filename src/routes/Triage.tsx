/**
 * Triage — the default screen (§5, screen 1), rendered as the Today
 * dashboard (per Ali's reference design).
 *
 * Called by: the router, at "/".
 * Calls: ipc triage_rows / calendar_items; useCourses; localPrefs
 * (nicknames, done marks).
 *
 * This file is deliberately thin: it loads the data, owns the assignment
 * sheet, and hands everything to TodayView. Ranking happens in
 * `src-tauri/src/triage.rs`, never here (§10). "Done" marks and nicknames
 * are view state (localStorage) by design.
 *
 * The old dense "board" layout (stat-tile filters, keyboard queue, group
 * views) was retired in favor of this single calm page — it lives in git
 * history if a power view is ever wanted back as its own route.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { AssignmentSheet } from "@/components/grade/AssignmentSheet";
import { TodayView } from "@/components/today/TodayView";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses } from "@/hooks/useCourses";
import { calendarItems, courseDetail, triageRows } from "@/lib/ipc";
import { courseShort } from "@/lib/courseLabel";
import { setDone, useDoneSet, useNicknames } from "@/lib/localPrefs";
import type { AssignmentDetail, CalendarItem, TriageRow } from "@/types";

export default function Triage() {
  const [rows, setRows] = useState<TriageRow[] | null>(null);
  const [week, setWeek] = useState<CalendarItem[]>([]);
  const [openAssignment, setOpenAssignment] = useState<AssignmentDetail | null>(null);
  const { courses, openTotal, overallCurrentPct, loaded } = useCourses();
  const { status: auth } = useAuth();
  const nicknames = useNicknames();
  const doneSet = useDoneSet();
  // Captured once per mount so filters compute purely during render.
  const [mountNow] = useState(() => Date.now());

  const refresh = useCallback(() => {
    triageRows()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    refresh();
    const now = Date.now();
    calendarItems()
      .then((items) =>
        setWeek(
          items
            .filter((i) => !i.submitted && !i.graded)
            .filter((i) => {
              const t = new Date(i.dueAt).getTime();
              return t > now && t < now + 7 * 86_400_000;
            })
            .slice(0, 8),
        ),
      )
      .catch(() => {});
  }, [refresh]);

  /** Nickname-aware short label for a course. */
  const labelOf = useCallback(
    (courseId: string, courseCode: string | null) =>
      nicknames[courseId] ?? courseShort(courseCode),
    [nicknames],
  );

  // Done marks are view-layer subtraction, never mutation.
  const visibleRows = useMemo(
    () => (rows === null ? null : rows.filter((r) => !doneSet.has(r.assignmentId))),
    [rows, doneSet],
  );

  // ONE definition of "due this week" (open work, next 7 days) — the pulse
  // tile's number and the week bars both come from this set.
  const weekRows = useMemo(() => {
    if (visibleRows === null) return [];
    return visibleRows.filter((r) => {
      if (!r.dueAt) return false;
      const t = new Date(r.dueAt).getTime();
      return t > mountNow && t < mountNow + 7 * 86_400_000;
    });
  }, [visibleRows, mountNow]);

  const openSheet = useCallback((row: TriageRow) => {
    courseDetail(row.courseId)
      .then((d) => {
        const a = d.assignments.find((x) => x.id === row.assignmentId);
        if (a) setOpenAssignment(a);
        else toast.error("Could not load that assignment.");
      })
      .catch(() => toast.error("Could not load that assignment."));
  }, []);

  const markDone = useCallback((row: TriageRow) => {
    setDone(row.assignmentId, true);
    toast.success(`Done: ${row.name ?? "assignment"}`, {
      action: { label: "Undo", onClick: () => setDone(row.assignmentId, false) },
    });
  }, []);

  const visible = courses.filter((c) => !c.hidden && c.gradeable && c.active);
  const missingTotal = visible.reduce((n, c) => n + c.missingCount, 0);

  const subtitle = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (visibleRows === null || !loaded) {
    return (
      <>
        <ScreenHeader title="Today" subtitle={subtitle} />
        <div className="mx-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Skeleton className="h-40 rounded-3xl xl:col-span-3" />
          <Skeleton className="h-64 rounded-3xl xl:col-span-2" />
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl xl:col-span-2" />
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Today" subtitle={subtitle} />
      <TodayView
        rows={visibleRows}
        courses={visible}
        openTotal={openTotal}
        missingTotal={missingTotal}
        overallPct={overallCurrentPct}
        weekRows={weekRows}
        weekItems={week}
        labelOf={labelOf}
        userName={auth.validatedAs}
        onOpen={openSheet}
        onDone={markDone}
      />
      <AssignmentSheet
        assignment={openAssignment}
        onOpenChange={(open) => !open && setOpenAssignment(null)}
        onChanged={refresh}
      />
    </>
  );
}
