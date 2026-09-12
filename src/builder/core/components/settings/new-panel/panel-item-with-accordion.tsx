import { isFunction } from "lodash-es";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { cn } from "~/lib/utils";

function PanelItemWithAccordion({
  children,
  leftLabel,
  rightLabel,
  defaultOpen = true,
  value = "",
  itemClassName = "",
}: {
  children: React.ReactNode;
  leftLabel?: React.ReactNode | ((open: boolean) => React.ReactNode) | string;
  rightLabel?: React.ReactNode | ((open: boolean) => React.ReactNode) | string;
  defaultOpen?: boolean;
  value?: string;
  itemClassName?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen ? value : undefined);

  return (
    <Accordion type="single" value={open || ""} onValueChange={(a) => setOpen(a || undefined)} collapsible>
      <AccordionItem value={value} className={cn("border-b-0 border-t", itemClassName)}>
        <div className="flex items-center gap-x-2 justify-between">
          <AccordionTrigger className="flex-1 py-2.5 gap-x-1 text-xs font-medium hover:no-underline text-foreground">
            {isFunction(leftLabel) ? leftLabel(open as any) : leftLabel || t("Panel name")}
          </AccordionTrigger>
          {rightLabel && <div className="shrink-0 pr-1">{isFunction(rightLabel) ? rightLabel(open as any) : rightLabel}</div>}
        </div>
        <AccordionContent className="pb-2">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default PanelItemWithAccordion;
