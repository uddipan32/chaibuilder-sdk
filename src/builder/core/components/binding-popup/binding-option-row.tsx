import { IdCardIcon, LoopIcon } from "@radix-ui/react-icons";
import React from "react";

export type BindingOptionIcon = "repeater" | "collection" | "field";

/**
 * Row content shared by every data-binding popup (settings-panel path selector,
 * `{{` suggestion dropdown, visibility-expression autocomplete): icon + key label
 * on the left, truncated value preview + caller-specific affordance on the right.
 * The parent supplies the interactive wrapper (CommandItem / button) with a
 * `flex items-center justify-between` layout.
 */
export const BindingOptionRow = ({
  label,
  icon = "field",
  preview,
  right,
}: {
  label: string;
  icon?: BindingOptionIcon;
  preview?: string;
  right?: React.ReactNode;
}) => (
  <>
    <span className="flex min-w-0 flex-1 items-center gap-x-2">
      {icon === "repeater" ? (
        <LoopIcon className="h-3 w-3 shrink-0" />
      ) : icon === "collection" ? (
        <IdCardIcon className="h-3 w-3 shrink-0" />
      ) : (
        <span className="h-px w-3 shrink-0 rounded-full border-b border-b-foreground bg-transparent opacity-10" />
      )}
      <span className="truncate">{label}</span>
    </span>
    <span className="flex shrink-0 items-center gap-2">
      {preview ? <span className="max-w-32 truncate text-[10px] text-muted-foreground">{preview}</span> : null}
      {right}
    </span>
  </>
);
