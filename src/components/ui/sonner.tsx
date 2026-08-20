/**
 * sonner.tsx — toast host (§9.5).
 *
 * NOTE: this is the one file in `components/ui/` that is hand-edited, and it is
 * a deliberate deviation from the "generated, do not touch" rule in SPEC.md
 * §10. The shadcn generator emits `import { useTheme } from "next-themes"`,
 * which is a Next.js package this app has no business depending on. It is
 * rewired to our own provider instead. If you re-run `npx shadcn add sonner`,
 * it will clobber this and pull next-themes back in — re-apply this edit.
 */
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/hooks/useTheme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolved } = useTheme();

  return (
    <Sonner
      theme={resolved}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-popover",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:text-critical-fg",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
