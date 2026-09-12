import { Hand, MousePointer2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCanvasTool } from "~/builder/hooks/use-pannable-canvas";
import { Button } from "~/components/ui/button";

/**
 * Figma-style Select/Hand tool switcher shown in the canvas topbar while
 * pannable mode is on. Select (V) for normal editing, Hand (H) to drag the
 * canvas around; the active tool gets a solid highlight.
 */
export const CanvasToolBar = () => {
  const [tool, setTool] = useCanvasTool();
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
      <Button
        size="sm"
        aria-label={t("Select")}
        variant={tool === "select" ? "secondary" : "ghost"}
        className={`h-6 w-6 rounded-sm p-1 ${
          tool === "select" ? "bg-orange text-orange-foreground hover:bg-orange/90" : "text-foreground/50"
        }`}
        title={`${t("Select")} (V)`}
        onClick={() => setTool("select")}>
        <MousePointer2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        aria-label={t("Hand tool")}
        variant={tool === "hand" ? "secondary" : "ghost"}
        className={`h-6 w-6 rounded-sm p-1 ${
          tool === "hand" ? "bg-orange text-orange-foreground hover:bg-orange/90" : "text-foreground/50"
        }`}
        title={`${t("Hand tool")} (H)`}
        onClick={() => setTool("hand")}>
        <Hand className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
