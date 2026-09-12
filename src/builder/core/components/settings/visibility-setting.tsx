import { TrashIcon } from "@radix-ui/react-icons";
import { has, isString } from "lodash-es";
import { Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageExternalData } from "~/builder/atoms/builder";
import { UserDataBinding } from "~/builder/core/components/settings/user-data-binding";
import { useRepeaterBindingContext } from "~/builder/hooks/use-repeater-binding-context";
import { useSelectedBlock } from "~/builder/hooks/use-selected-blockIds";
import { useUpdateBlocksProps } from "~/builder/hooks/use-update-blocks-props";
import { STATE_CONTEXT_PREFIX } from "~/constants/STRINGS";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Switch } from "~/components/ui/switch";

export const VisibilitySettings = () => {
  const { t } = useTranslation();
  const selectedBlock = useSelectedBlock();
  const externalData = usePageExternalData();
  const { repeaterData } = useRepeaterBindingContext();
  const updateBlockProps = useUpdateBlocksProps();

  // Inside a Repeater the expression is evaluated per item, so the current item's fields
  // must be offered (and validated) under `$index` — same convention as prop bindings.
  const bindingData = useMemo(
    () => (repeaterData ? { [`${STATE_CONTEXT_PREFIX}index`]: repeaterData, ...externalData } : externalData),
    [externalData, repeaterData],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const removeBindingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (removeBindingTimeoutRef.current) {
        clearTimeout(removeBindingTimeoutRef.current);
      }
    };
  }, []);

  const saveExpression = (expression: string) => {
    if (!selectedBlock) return;

    if (!expression || expression.trim() === "") {
      if (isString(selectedBlock._show)) {
        updateBlockProps([selectedBlock._id], { _show: true });
      }
      return;
    }

    updateBlockProps([selectedBlock._id], {
      _show: `{{${expression.trim()}}}`,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const onToggleShow = () => {
    if (!selectedBlock) return;
    const currentShow = has(selectedBlock, "_show") ? selectedBlock._show : true;
    updateBlockProps([selectedBlock._id], {
      _show: !currentShow,
    });
  };

  const removeBinding = () => {
    if (!selectedBlock) return;
    updateBlockProps([selectedBlock._id], { _show: true });
    setIsRemoving(true);
    if (removeBindingTimeoutRef.current) {
      clearTimeout(removeBindingTimeoutRef.current);
    }
    removeBindingTimeoutRef.current = setTimeout(() => {
      setIsRemoving(false);
    }, 200);
    setIsOpen(false);
  };

  if (!selectedBlock) return null;

  const isBound = isString(selectedBlock._show);
  const currentExpression = isBound
    ? selectedBlock._show.startsWith("{{") && selectedBlock._show.endsWith("}}")
      ? selectedBlock._show.slice(2, -2).trim()
      : selectedBlock._show
    : "";

  return (
    <div className="my-2 mb-4 flex items-center justify-between">
      <div className="mr-2 flex min-w-0 flex-1 flex-col items-start space-y-0 leading-none">
        <div className="flex items-baseline gap-1 text-xs text-gray-500">
          {t("Visibility")}
          {isString(selectedBlock._show) && (
            <span className="text-[9px] text-gray-400 italic">{t("visible when true")}</span>
          )}
        </div>
        {isString(selectedBlock._show) && (
          <code className="bg-primary/10 text-primary mt-0.5 block max-w-full rounded px-1.5 py-0.5 text-[9px] leading-relaxed break-words">
            {currentExpression}
          </code>
        )}
      </div>
      <div className="group relative">
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("Open visibility settings")}
              className="bg-background absolute -top-1.5 -left-2 z-10 cursor-pointer rounded-full border border-blue-500 p-0.5 text-blue-500 transition-all hover:scale-125">
              <Settings className="h-2.5 w-2.5" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="left" align="start" className="max-w-92 p-3">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs leading-none font-medium">{t("Conditional Visibility")}</h4>
                  <p className="text-muted-foreground text-[10px]">
                    {t(
                      "Choose a boolean data path or add boolean pipes. The block is visible only when the result is true.",
                    )}
                  </p>
                </div>
                {isBound && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-500"
                    onClick={removeBinding}>
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="relative">
                <UserDataBinding
                  currentExpression={currentExpression}
                  externalData={bindingData as Record<string, any>}
                  isOpen={isOpen}
                  onSave={(nextExpression) => {
                    if (isRemoving) return;
                    saveExpression(nextExpression);
                    setIsOpen(false);
                  }}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Switch
          checked={isBound ? true : has(selectedBlock, "_show") ? selectedBlock._show : true}
          onCheckedChange={onToggleShow}
          disabled={isBound}
        />
      </div>
    </div>
  );
};
