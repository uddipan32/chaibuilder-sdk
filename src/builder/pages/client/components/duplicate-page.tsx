import { initial, isEmpty } from "lodash-es";
import { File } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDuplicatePage } from "~/builder/pages/hooks/pages/use-duplicate-page";
import { useChangePage } from "~/builder/pages/hooks/use-change-page";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { SlugInput } from "./slug-input";

const DuplicatePage = ({
  page,
  onClose,
  closePanel = () => {},
}: {
  page: any;
  onClose: () => void;
  closePanel: () => void;
}) => {
  const { t } = useTranslation();
  const { mutate: duplicatePage, isPending } = useDuplicatePage();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(`${page.name} (Copy)`);
  const changePage = useChangePage();

  // Check if it's a partial (empty slug)
  const isPartial = isEmpty(page.slug);

  // Only set slug state if it's not a partial
  const [slug, setSlug] = useState(isPartial ? "" : `${page.slug.split("/").pop()}-copy`);

  // Only calculate baseSlug if it's not a partial
  const baseSlug = isPartial ? "" : initial(page.slug.split("/")).join("/");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!name.trim()) {
      setError(t("Name is required"));
      return;
    }

    // Only validate slug if it's not a partial
    if (!isPartial && !slug.trim()) {
      setError(t("Slug is required"));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    // Create payload based on whether it's a partial or not
    const payload: { pageId: string; name: string; slug?: string } = {
      pageId: page.id,
      name,
    };

    // Only include slug in the payload if it's not a partial
    if (!isPartial) {
      payload.slug = `${baseSlug}/${slug}`;
    }

    duplicatePage(payload, {
      onSuccess: (response) => {
        setIsSubmitting(false);
        onClose();
        changePage((response as any).id, closePanel);
      },
      onError: (error: any) => {
        setIsSubmitting(false);

        // Handle specific error cases
        if (error.code === "SLUG_EXISTS") {
          setError(t("A page with this slug already exists. Please choose a different slug."));
        } else if (error.code === "INVALID_SLUG") {
          setError(t("The slug format is invalid. Please use only lowercase letters, numbers, and hyphens."));
        } else if (error.code === "PERMISSION_DENIED") {
          setError(t("You don't have permission to duplicate this page."));
        } else {
          setError(error.message || t("Failed to duplicate page. Please try again later."));
        }
      },
    });
  };

  return (
    <Dialog open={!!page} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("Duplicate Page")}</DialogTitle>
          <DialogDescription>{t("Create a copy of the page with a new name and slug")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border bg-gradient-to-br from-accent/50 to-accent/30 px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
              <File className="h-3 w-3 text-primary" />
            </div>
            <div className="text-xs text-foreground">{t("Current Page Details")}</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="min-w-[45px] text-xs font-medium text-muted-foreground">{t("Name")}:</span>
              <span className="flex-1 text-xs font-medium text-foreground">{page.name}</span>
            </div>
            {!isPartial && (
              <div className="flex items-start gap-2">
                <span className="min-w-[45px] text-xs font-medium text-muted-foreground">{t("Slug")}:</span>
                <code className="flex-1 font-mono text-xs text-foreground">{page.slug}</code>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="min-w-[45px] text-xs font-medium text-muted-foreground">{t("Type")}:</span>
              <span className="inline-flex items-center rounded-full text-xs text-foreground">{page.pageType}</span>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t("Name")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {/* Only show slug input if it's not a partial */}
          {!isPartial && (
            <div className="space-y-`">
              <Label htmlFor="slug">{t("Slug")}</Label>
              <SlugInput
                value={slug}
                onChange={(value) => setSlug(value)}
                parentSlug={baseSlug}
                onValidationChange={(isValid) => {
                  if (!isValid) {
                    setError(t("Invalid slug"));
                  } else {
                    setError(null);
                  }
                }}
              />
            </div>
          )}

          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button
              loading={isPending || isSubmitting}
              type="submit"
              disabled={!name.trim() || (!isPartial && !slug.trim())}>
              {t("Duplicate")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicatePage;
