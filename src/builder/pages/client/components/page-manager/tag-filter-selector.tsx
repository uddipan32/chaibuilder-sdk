import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "~/components/ui/badge";

interface TagFilterSelectorProps {
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  /** Tags actually present across the site's pages. */
  availableTags?: string[];
}

/**
 * Selectable tag badges that filter the pages list by tag (OR semantics),
 * mirroring the add-block panel's tag chips. Sits in the pages-manager header
 * and renders nothing only when there are neither available nor active tags.
 */
export const TagFilterSelector = ({ selectedTags, setSelectedTags, availableTags = [] }: TagFilterSelectorProps) => {
  const { t } = useTranslation();

  // Include any active tags that are no longer present in the dataset (e.g. restored
  // from sessionStorage after the last page carrying them was deleted) so the filter
  // stays visible and clearable.
  const tags = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const tag of [...availableTags, ...selectedTags]) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(tag);
    }
    return result.sort((a, b) => a.localeCompare(b));
  }, [availableTags, selectedTags]);

  if (tags.length === 0) return null;

  const toggle = (tag: string) => {
    const isSelected = selectedTags.some((s) => s.toLowerCase() === tag.toLowerCase());
    setSelectedTags(
      isSelected ? selectedTags.filter((s) => s.toLowerCase() !== tag.toLowerCase()) : [...selectedTags, tag],
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => {
        const isActive = selectedTags.some((s) => s.toLowerCase() === tag.toLowerCase());
        return (
          <Badge
            key={tag}
            variant={isActive ? "active" : "inactive"}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            onClick={() => toggle(tag)}
            onKeyDown={(e) => {
              // Native button semantics: Enter activates on keydown; Space is
              // prevented here (to stop scrolling) and activates on keyup.
              if (e.key === "Enter") {
                e.preventDefault();
                toggle(tag);
              } else if (e.key === " ") {
                e.preventDefault();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " ") {
                e.preventDefault();
                toggle(tag);
              }
            }}>
            {tag}
          </Badge>
        );
      })}
      {selectedTags.length > 0 ? (
        <button
          type="button"
          onClick={() => setSelectedTags([])}
          className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          {t("Clear")}
        </button>
      ) : null}
    </div>
  );
};
