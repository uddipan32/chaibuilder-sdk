import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { ManualClasses } from "~/builder/core/components/settings/new-panel/manual-classes";
import { useFeatureLabel } from "~/builder/hooks/use-feature-label";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useDesignTokensContext } from "./manage-design-tokens-context";

export const TokenForm: React.FC = () => {
  const { t } = useTranslation();
  const designTokensLabel = useFeatureLabel("designTokens");
  const {
    viewMode,
    isEditingBuiltIn,
    tokenName,
    classes,
    tokenNameError,
    isSaving,
    editingTokenId,
    handleTokenNameChange,
    handleAddClass,
    handleRemoveClass,
    cancelEdit,
    saveToken,
    resetToBuiltIn,
  } = useDesignTokensContext();

  const isEditMode = viewMode === "edit";
  const singularLabel = designTokensLabel.toLowerCase().endsWith("s")
    ? designTokensLabel.slice(0, -1)
    : designTokensLabel;
  const title = isEditMode ? `${t("Edit")} ${singularLabel}` : `${t("Add")} ${singularLabel}`;
  const description = isEditMode
    ? `${t("Update")} ${singularLabel.toLowerCase()}`
    : `${t("Create a reusable")} ${singularLabel.toLowerCase()}`;

  return (
    <div className="flex h-full flex-col">
      {/* Header with back button */}
      <div className="mb-3 flex items-center gap-2 rounded-md border border-border/50 bg-accent p-1.5">
        <Button variant="ghost" size="icon-xs" className="hover:bg-secondary" onClick={cancelEdit}>
          <ArrowLeftIcon className="h-3 w-3" />
        </Button>
        <div className="flex-1">
          <h3 className="text-xs font-semibold text-foreground">{title}</h3>
          <p className="text-[10px] font-light text-muted-foreground">{description}</p>
        </div>
        {isEditMode && isSaving && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          </div>
        )}
      </div>

      {/* Form Content */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        <div className="space-y-1.5">
          <Label htmlFor="token-name">{t("Token Name")}</Label>
          <Input
            id="token-name"
            placeholder="Button-Primary"
            value={tokenName}
            onChange={(e) => handleTokenNameChange(e.target.value)}
            className="h-7 text-xs"
            disabled={isEditingBuiltIn}
            readOnly={isEditingBuiltIn}
          />
          {tokenNameError ? (
            <span className="text-[10px] text-destructive">{tokenNameError}</span>
          ) : (
            <span className="text-[10px] font-light text-muted-foreground">
              {isEditingBuiltIn
                ? `${t("Built-in")} ${singularLabel.toLowerCase()} ${t("names cannot be changed")}`
                : t("Button-Primary, Card-Header, Text-Large etc.")}
            </span>
          )}
        </div>

        <ManualClasses
          from="designToken"
          classFromProps={classes}
          onAddNew={handleAddClass}
          onRemove={handleRemoveClass}
          showDesignTokenSuggestions={false}
        />

        {/* Footer */}
        <div className="mt-3 flex items-center justify-end gap-2 pt-3">
          <Button variant="ghost" onClick={cancelEdit} size="sm">
            {t("Cancel")}
          </Button>
          {isEditMode && isEditingBuiltIn && (
            <Button
              variant="outline"
              onClick={() => editingTokenId && resetToBuiltIn(editingTokenId)}
              size="sm"
              className="border-primary/50 text-primary hover:bg-primary/10">
              {t("Reset to Built-in")}
            </Button>
          )}
          <Button onClick={saveToken} disabled={!tokenName.trim() || !classes.trim() || !!tokenNameError} size="sm">
            {isEditMode ? t("Save") : t("Add")}
          </Button>
        </div>
      </div>
    </div>
  );
};
