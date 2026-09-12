import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

interface TagsInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  /** Existing site tags + defaults shown as suggestions. */
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

/** Normalize a single tag: trim + collapse internal whitespace. */
const normalizeTag = (tag: string): string => tag.trim().replace(/\s+/g, " ");

/**
 * Multi-select free-form tag input. Selected tags render as removable badges;
 * a popover Command lists matching suggestions and offers "Create ‹typed›" when
 * the typed value isn't already an exact suggestion or selected tag.
 */
export const TagsInput = ({ value, onChange, suggestions = [], placeholder, className }: TagsInputProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const selectedLower = useMemo(() => new Set(value.map((t) => t.toLowerCase())), [value]);

  const addTag = (raw: string) => {
    const cleaned = normalizeTag(raw);
    if (!cleaned) return;
    if (selectedLower.has(cleaned.toLowerCase())) return;
    onChange([...value, cleaned]);
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  // Suggestions not already selected, filtered by the current input.
  const availableSuggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    return suggestions.filter((s) => !selectedLower.has(s.toLowerCase()) && s.toLowerCase().includes(query));
  }, [suggestions, selectedLower, inputValue]);

  const trimmedInput = normalizeTag(inputValue);
  const canCreate =
    trimmedInput.length > 0 &&
    !selectedLower.has(trimmedInput.toLowerCase()) &&
    !suggestions.some((s) => s.toLowerCase() === trimmedInput.toLowerCase());

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {value.map((tag) => (
        <Badge key={tag} variant="inactive" className="gap-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="cursor-pointer rounded-sm opacity-60 hover:opacity-100"
            aria-label={`Remove ${tag}`}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent">
            <Plus className="h-3 w-3" />
            {placeholder ?? "Add tag"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command
            filter={() => 1 /* filtering handled manually via availableSuggestions */}>
            <CommandInput
              placeholder="Search or create…"
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) {
                  e.preventDefault();
                  addTag(inputValue);
                }
              }}
            />
            <CommandList>
              {availableSuggestions.length === 0 && !canCreate ? (
                <CommandEmpty>No tags found.</CommandEmpty>
              ) : null}
              {availableSuggestions.length > 0 ? (
                <CommandGroup>
                  {availableSuggestions.map((suggestion) => (
                    <CommandItem key={suggestion} value={suggestion} onSelect={() => addTag(suggestion)}>
                      {suggestion}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {canCreate ? (
                <CommandGroup>
                  <CommandItem value={`__create__${trimmedInput}`} onSelect={() => addTag(inputValue)}>
                    <Plus className="h-3.5 w-3.5" />
                    Create "{trimmedInput}"
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
