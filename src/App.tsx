/**
 * App — router and providers. The composition root of the frontend.
 *
 * Called by: src/main.tsx.
 * Calls: react-router, ThemeProvider, AppShell, and every route.
 *
 * Provider order matters: ThemeProvider sits outside the router so a theme
 * change never remounts the current screen, and TooltipProvider sits outside
 * everything because tooltips are used inside the sidebar, which is outside the
 * routed area.
 *
 * HashRouter, not BrowserRouter: a Tauri release build loads the frontend from
 * `tauri://localhost` with no server behind it, so a deep path like
 * `/courses/123` would 404 on reload. Hash routing has no such failure mode and
 * the URL is never user-visible in a desktop window anyway.
 */
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/AppShell";
import Triage from "@/routes/Triage";
import Courses from "@/routes/Courses";
import CourseDetail from "@/routes/CourseDetail";
import Calendar from "@/routes/Calendar";
import Done from "@/routes/Done";
import Finance from "@/routes/Finance";
import FinanceTerm from "@/routes/FinanceTerm";
import Graduation from "@/routes/Graduation";
import StudyCourse from "@/routes/StudyCourse";
import StudyRead from "@/routes/StudyRead";
import StudyCheatSheet from "@/routes/StudyCheatSheet";
import StudyRecall from "@/routes/StudyRecall";
import StudyMap from "@/routes/StudyMap";
import StudySlides from "@/routes/StudySlides";
import StudyExam from "@/routes/StudyExam";
import StudyMistakes from "@/routes/StudyMistakes";
import Settings from "@/routes/Settings";
import Inbox from "@/routes/Inbox";
import DevTokens from "@/routes/DevTokens";
import DevPreview from "@/routes/DevPreview";
import DevDebug from "@/routes/DevDebug";

export default function App() {
  return (
    <ThemeProvider>
      {/* 120ms matches the micro-interaction duration in §9.4 — a tooltip that
          arrives slower than the pointer feels broken in a dense table. */}
      <TooltipProvider delayDuration={120} skipDelayDuration={300}>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Triage />} />
              <Route path="courses" element={<Courses />} />
              <Route path="courses/:courseId" element={<CourseDetail />} />
              <Route path="calendar" element={<Calendar />} />
              {/* Folded into each course's page (Syllabus, People and Study
                  tabs) and Today; old links land somewhere sensible. */}
              <Route path="syllabi" element={<Navigate to="/courses" replace />} />
              <Route path="contacts" element={<Navigate to="/courses" replace />} />
              <Route path="study" element={<Navigate to="/" replace />} />
              <Route path="study/:course" element={<StudyCourse />} />
              <Route path="study/mistakes" element={<StudyMistakes />} />
              <Route path="study/:course/exam" element={<StudyExam />} />
              <Route path="study/:course/recall" element={<StudyRecall />} />
              <Route path="study/:course/:chapter" element={<StudyRead />} />
              <Route path="study/:course/:chapter/cheatsheet" element={<StudyCheatSheet />} />
              <Route path="study/:course/:chapter/recall" element={<StudyRecall />} />
              <Route path="study/:course/:chapter/map" element={<StudyMap />} />
              <Route path="study/:course/:chapter/slides" element={<StudySlides />} />
              <Route path="graduation" element={<Graduation />} />
              <Route path="done" element={<Done />} />
              <Route path="finance" element={<Finance />} />
              <Route path="finance/:termId" element={<FinanceTerm />} />
              <Route path="settings" element={<Settings />} />
              <Route path="inbox" element={<Inbox />} />

              {/* Stripped from release builds by the bundler, since the
                  condition is statically false there. */}
              {import.meta.env.DEV && <Route path="dev/tokens" element={<DevTokens />} />}
              {import.meta.env.DEV && <Route path="dev/preview" element={<DevPreview />} />}
              {import.meta.env.DEV && <Route path="dev/debug" element={<DevDebug />} />}

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>

        {/* Bottom-right, auto-dismiss except on failure (§9.5). */}
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
