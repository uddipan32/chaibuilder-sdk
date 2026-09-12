import { MagnifyingGlassIcon, Pencil1Icon, PlusIcon } from "@radix-ui/react-icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { twMerge } from "cnfast";
import SearchInput from "~/builder/core/components/sidepanels/panels/add-blocks/search-input";
import { useFeatureLabel } from "~/builder/hooks/use-feature-label";
import { usePermissions } from "~/builder/hooks/use-permissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { CHAI_PERMISSIONS } from "~/constants/PERMISSIONS";
import { useDesignTokensContext } from "./manage-design-tokens-context";

interface SingleTokenProps {
  tokenId: string;
  token: { name: string; value: string; archived?: boolean };
  isBuiltIn: boolean;
  isEdited: boolean;
  isSelected: boolean;
  isArchived?: boolean;
}

export const SingleToken: React.FC<SingleTokenProps> = ({
  tokenId,
  token,
  isBuiltIn,
  isEdited,
  isSelected,
  isArchived = false,
}) => {
  const { t } = useTranslation();
  const { selectToken, startEdit, unarchiveToken, deleteToken } = useDesignTokensContext();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(CHAI_PERMISSIONS["design_tokens:edit"]);
  const canDelete = hasPermission(CHAI_PERMISSIONS["design_tokens:delete"]);

  return (
    <div
      onClick={() => selectToken(tokenId)}
      className={twMerge(
        "group relative flex w-full cursor-pointer items-center justify-between rounded border p-1.5 transition-all",
        isArchived ? "border-muted bg-muted/30 opacity-60" : isSelected ? "bg-accent/70" : "hover:bg-muted/5",
      )}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div
            className={twMerge(
              "truncate text-xs font-medium text-foreground/80",
              isArchived && "text-muted-foreground",
            )}>
            {token.name}
          </div>
          {isEdited && isBuiltIn && !isArchived && (
            <Badge variant="active" className="h-4 px-1 py-0 text-[9px] font-normal">
              {t("Edited")}
            </Badge>
          )}
        </div>
        <div
          className={twMerge(
            "line-clamp-1 w-[90%] text-[10px] font-light text-foreground/30",
            isArchived && "opacity-70",
          )}>
          {token.value}
        </div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
        {isArchived ? (
          <>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  unarchiveToken(tokenId);
                }}>
                <span className="text-[10px]">Restore</span>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteToken(tokenId);
                }}
                className="text-destructive hover:text-destructive">
                <span className="text-[10px]">Delete</span>
              </Button>
            )}
          </>
        ) : (
          canEdit && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation();
                startEdit(tokenId);
              }}>
              <Pencil1Icon className="!h-3 !w-3" />
            </Button>
          )
        )}
      </div>
    </div>
  );
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, message, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      {icon || <MagnifyingGlassIcon className="h-8 w-8 text-muted-foreground" />}
      <p className="text-xs text-muted-foreground">{message}</p>
      {actionLabel && onAction && (
        <Button variant="default" onClick={onAction} size="sm" className="mt-4 h-7 text-xs leading-tight">
          <PlusIcon className="mr-1 h-3 w-3" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const BuiltInTokensList: React.FC = () => {
  const { t } = useTranslation();
  const designTokensLabel = useFeatureLabel("designTokens");
  const { builtInTokens, searchQuery, setSearchQuery, selectedTokenId, isTokenEdited } = useDesignTokensContext();

  const filteredTokens = useMemo(() => {
    return builtInTokens.filter(
      ([, token]) =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.value.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [builtInTokens, searchQuery]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex-shrink-0">
        <SearchInput
          value={searchQuery}
          setValue={setSearchQuery}
          placeholder={t("Search built-in {{label}}", { label: designTokensLabel })}
        />
      </div>

      <div className="max-h-[550px] min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-1 pr-4">
          {filteredTokens.length === 0 ? (
            <EmptyState message={t("No tokens match your search")} />
          ) : (
            <>
              {filteredTokens.map(([tokenId, token]) => (
                <SingleToken
                  key={tokenId}
                  token={token}
                  tokenId={tokenId}
                  isSelected={selectedTokenId === tokenId}
                  isBuiltIn={true}
                  isEdited={isTokenEdited(tokenId)}
                  isArchived={false}
                />
              ))}
            </>
          )}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
};

export const CustomTokensList: React.FC = () => {
  const { t } = useTranslation();
  const designTokensLabel = useFeatureLabel("designTokens");
  const { customTokens, searchQuery, setSearchQuery, selectedTokenId, startAdd, archiveToken, getTokenUsageCount } =
    useDesignTokensContext();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(CHAI_PERMISSIONS["design_tokens:create"]);
  const canEdit = hasPermission(CHAI_PERMISSIONS["design_tokens:edit"]);

  const [archiveConfirmation, setArchiveConfirmation] = useState<{
    isOpen: boolean;
    tokenId: string | null;
    tokenName: string;
    pageCount: number;
    partialCount: number;
  }>({
    isOpen: false,
    tokenId: null,
    tokenName: "",
    pageCount: 0,
    partialCount: 0,
  });

  const filteredTokens = useMemo(() => {
    return customTokens.filter(
      ([, token]) =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.value.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [customTokens, searchQuery]);

  const activeTokens = useMemo(() => filteredTokens.filter(([, token]) => !token.archived), [filteredTokens]);
  const archivedTokens = useMemo(() => filteredTokens.filter(([, token]) => token.archived), [filteredTokens]);

  const handleArchiveClick = (tokenId: string, tokenName: string) => {
    const { pageCount, partialCount } = getTokenUsageCount(tokenId);
    setArchiveConfirmation({
      isOpen: true,
      tokenId,
      tokenName,
      pageCount,
      partialCount,
    });
  };

  const confirmArchive = () => {
    if (archiveConfirmation.tokenId) {
      archiveToken(archiveConfirmation.tokenId);
    }
    setArchiveConfirmation({
      isOpen: false,
      tokenId: null,
      tokenName: "",
      pageCount: 0,
      partialCount: 0,
    });
  };

  return (
    <div className="flex h-full flex-col gap-2">
      {customTokens.length > 0 && (
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between gap-x-2">
            <SearchInput value={searchQuery} setValue={setSearchQuery} placeholder={t("Search tokens")} />
            {canCreate && (
              <Button variant="outline" onClick={startAdd} size="sm" className="h-8">
                <PlusIcon />
                {t("Add")}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-1 pr-4">
          {customTokens.length === 0 ? (
            <EmptyState
              message={`${t("No custom")} ${designTokensLabel.toLowerCase()} ${t("yet")}`}
              actionLabel={
                canCreate ? t("Add custom {{items}}", { items: designTokensLabel.toLowerCase() }) : undefined
              }
              onAction={canCreate ? startAdd : undefined}
            />
          ) : filteredTokens.length === 0 ? (
            <EmptyState message={t("No tokens match your search")} />
          ) : (
            <>
              {activeTokens.length > 0 && (
                <div className="space-y-1">
                  {activeTokens.map(([tokenId, token]) => (
                    <div key={tokenId} className="group relative">
                      <SingleToken
                        token={token}
                        tokenId={tokenId}
                        isSelected={selectedTokenId === tokenId}
                        isBuiltIn={false}
                        isEdited={false}
                        isArchived={false}
                      />
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveClick(tokenId, token.name);
                          }}>
                          <span className="text-[10px]">Archive</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {archivedTokens.length > 0 && (
                <div className="mt-4 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">{t("Archived")}</div>
                  {archivedTokens.map(([tokenId, token]) => (
                    <SingleToken
                      key={tokenId}
                      token={token}
                      tokenId={tokenId}
                      isSelected={selectedTokenId === tokenId}
                      isBuiltIn={false}
                      isEdited={false}
                      isArchived={true}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          <div className="h-4" />
        </div>
      </div>

      <AlertDialog
        open={archiveConfirmation.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveConfirmation({
              isOpen: false,
              tokenId: null,
              tokenName: "",
              pageCount: 0,
              partialCount: 0,
            });
          }
        }}>
        <AlertDialogContent>
          <AlertDialogTitle>{t("Archive Design Token")}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              {t("This token is used on")} <span className="font-semibold">{archiveConfirmation.pageCount}</span>{" "}
              {t("pages")}
              {archiveConfirmation.partialCount > 0 && (
                <>
                  {" "}
                  {t("and")} <span className="font-semibold">{archiveConfirmation.partialCount}</span> {t("partials")}
                </>
              )}
              .
            </p>
            <p className="text-sm text-destructive">
              {t("Archiving this token will remove the styling for those blocks.")}
            </p>
            <p>{t("Do you wish to continue?")}</p>
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("Archive")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
