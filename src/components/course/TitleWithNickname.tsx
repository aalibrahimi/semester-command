/**
 * Course page title with an editable nickname.
 */
import { useState } from "react";
import { Pencil } from "lucide-react";
import { announceCoursesChanged } from "@/hooks/useCourses";
import { setNickname } from "@/lib/localPrefs";

/** The course title with an inline nickname editor: the pencil appears on
 *  hover; the nickname is view-layer state used everywhere. */
export function TitleWithNickname({
  courseId,
  nickname,
  fallback,
}: {
  courseId: string;
  nickname: string | undefined;
  fallback: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setNickname(courseId, value);
          setEditing(false);
          announceCoursesChanged();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder={fallback}
        className="w-64 rounded-md border border-brand bg-transparent px-2 py-0.5 font-display text-xl font-semibold outline-none"
      />
    );
  }
  return (
    <span className="group inline-flex items-center gap-2">
      {nickname ?? fallback}
      <button
        type="button"
        onClick={() => {
          setValue(nickname ?? "");
          setEditing(true);
        }}
        title="Set a nickname — used everywhere in place of the Canvas name"
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity duration-micro hover:bg-fill-ghost group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

/* ── Composition donut ───────────────────────────────────────────────────── */
