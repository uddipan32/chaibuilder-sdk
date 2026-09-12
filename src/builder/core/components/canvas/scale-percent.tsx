import { round } from "lodash-es";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCanvasZoom } from "~/builder/hooks/use-canvas-zoom";
import {
  resetCanvasZoomPan,
  usePannableCanvas,
  zoomCanvasAtCenter,
} from "~/builder/hooks/use-pannable-canvas";
import { Button } from "~/components/ui/button";

export const ScalePercent = () => {
  const [zoom] = useCanvasZoom();
  const [pannable] = usePannableCanvas();
  const { t } = useTranslation();

  if (!pannable) {
    return <div className="px-2 text-xs text-foreground/50">{round(zoom, 0)}%</div>;
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button
        size="sm"
        variant="ghost"
        className="size-2 h-6 w-6 rounded-md p-1"
        aria-label={t("Zoom out")}
        title={t("Zoom out")}
        onClick={() => zoomCanvasAtCenter(zoom / 1.2)}>
        <Minus className="h-3 w-3" />
      </Button>
      <button
        type="button"
        className="w-10 px-1 text-center text-xs text-foreground/50 hover:text-foreground"
        title={t("Reset zoom")}
        onClick={resetCanvasZoomPan}>
        {round(zoom, 0)}%
      </button>
      <Button
        size="sm"
        variant="ghost"
        className="size-2 h-6 w-6 rounded-md p-1"
        aria-label={t("Zoom in")}
        title={t("Zoom in")}
        onClick={() => zoomCanvasAtCenter(zoom * 1.2)}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
};
