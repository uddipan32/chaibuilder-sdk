import { Cross1Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

import { cn } from "~/lib/utils";

const SearchInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    setValue: (query: string) => void;
    placeholder?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    autoFocus?: boolean;
    disabled?: boolean;
    className?: string;
    autoComplete?: string;
  }
>(function SearchInput(
  { value, setValue, placeholder, onKeyDown, autoFocus = false, disabled = false, className = "", autoComplete = "on" },
  ref,
) {
  const { t } = useTranslation();
  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          ref={ref}
          placeholder={placeholder ? t(placeholder) : t("Search blocks...")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          disabled={disabled}
          name="search-input"
          autoComplete={autoComplete}
          className={cn("h-8 w-full pr-8", className)}
        />
        {value ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setValue("")}
            disabled={disabled}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-0 hover:bg-transparent hover:text-destructive">
            <Cross1Icon className="h-2.5 w-2.5 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer p-0 hover:bg-transparent hover:text-destructive">
            <MagnifyingGlassIcon className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
});

export default SearchInput;
