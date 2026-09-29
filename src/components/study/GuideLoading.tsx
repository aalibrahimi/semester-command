/**
 * The placeholder a Study view shows for the moment between opening a
 * chapter and its guide arriving (from memory it is instant; from the
 * content cache or a bundled chunk it is a few milliseconds).
 */
export function GuideLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
        Opening the chapter…
      </div>
    </div>
  );
}
