import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import { isEmpty, noop } from "lodash-es";
import React, { Suspense, useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FallbackError } from "~/builder/core/components/fallback-error";
import { AiStylePrompt } from "~/builder/core/components/settings/new-panel/ai-style-prompt";
import { BlockAttributesEditor } from "~/builder/core/components/settings/new-panel/block-attributes-editor";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { useLanguages } from "~/builder/hooks/use-languages";
import { usePermissions } from "~/builder/hooks/use-permissions";
import { useSavePage } from "~/builder/hooks/use-save-page";
import { useSelectedBlock } from "~/builder/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/builder/hooks/use-selected-styling-blocks";
import { useActiveSettingsTab } from "~/builder/hooks/use-theme";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CHAI_PERMISSIONS } from "~/constants/PERMISSIONS";
import { ResetStylesButton } from "./choices/reset-all-styles";

// Deferred: block settings pulls in the rjsf form stack (@rjsf + ajv) and the tiptap
// editors behind the richtext/binding widgets. Block styling reaches react-autosuggest
// through STYLING_GROUPS. Neither is needed to paint the builder shell, so both load
// once a block is actually selected.
const LazyBlockSettings = React.lazy(() => import("~/builder/core/components/settings/block-settings"));
const LazyBlockStyling = React.lazy(() => import("~/builder/core/components/settings/block-styling"));

const PanelFallback = ({ label }: { label: string }) => {
  const { t } = useTranslation();
  return <div className="p-4 text-xs text-muted-foreground">{t(label)}</div>;
};

const BlockSettings = () => (
  <Suspense fallback={<PanelFallback label="Loading settings..." />}>
    <LazyBlockSettings />
  </Suspense>
);

const BlockStyling = () => (
  <Suspense fallback={<PanelFallback label="Loading styles..." />}>
    <LazyBlockStyling />
  </Suspense>
);

function BlockAttributesToggle() {
  const [stylingBlocks] = useSelectedStylingBlocks();
  if (isEmpty(stylingBlocks)) {
    return null;
  }
  return <BlockAttributesEditor />;
}

const PartialWrapper = ({ partialBlockId }: { partialBlockId: string }) => {
  const { t } = useTranslation();
  const gotoPage = useBuilderProp("gotoPage", noop);
  const { saveState, savePageAsync } = useSavePage();
  const { selectedLang, fallbackLang } = useLanguages();
  const onDoubleClick = useCallback(
    async (e: any) => {
      e.stopPropagation();
      // Navigating into a partial/global requires the current page to be
      // persisted first, otherwise the destination loads stale blocks.
      if (saveState !== "SAVED") {
        try {
          await savePageAsync();
        } catch (error) {
          console.error("Failed to save page before opening partial block", error);
          toast.error(t("Could not save the page. Please try again."));
          return;
        }
      }
      gotoPage({ pageId: partialBlockId, lang: selectedLang || fallbackLang });
    },
    [saveState, savePageAsync, gotoPage, partialBlockId, selectedLang, fallbackLang, t],
  );
  return (
    <>
      <div className="hidden">
        <div onDoubleClick={onDoubleClick} className="h-full w-full items-center justify-center">
          <p className="rounded-md px-2 py-1 text-xs">{t("Partial block. Double click to edit.")}</p>
        </div>
      </div>
    </>
  );
};

const SettingsPanel: React.FC = () => {
  const selectedBlock = useSelectedBlock();
  const { t } = useTranslation();
  const onErrorFn = useBuilderProp("onError", noop);
  const { hasPermission } = usePermissions();
  const isSettingsDisabled = !hasPermission(CHAI_PERMISSIONS["pages:update"]);
  const isStylesDisabled = !hasPermission(CHAI_PERMISSIONS["pages:update"]);
  const [activeTab, setActiveTab] = useActiveSettingsTab();

  const isPartialBlock = selectedBlock && selectedBlock._type === "PartialBlock";

  if (isPartialBlock) {
    return <PartialWrapper partialBlockId={selectedBlock.partialBlockId!} />;
  }

  if (!selectedBlock) {
    return (
      <div className="h-full">
        <div className="flex h-full flex-col items-center justify-center px-4 text-center text-muted-foreground">
          <MixerHorizontalIcon className="mx-auto h-5 w-5" />
          <div className="text-sm font-light">{t("Please select a block to edit settings or styles")}</div>
        </div>
      </div>
    );
  }

  if (isSettingsDisabled && isStylesDisabled) {
    return (
      <div className="p-4 text-center">
        <div className="space-y-4 rounded-xl p-4 text-muted-foreground">
          <MixerHorizontalIcon className="mx-auto text-3xl" />
          <h1>{t("You don't have permission to edit settings or styles")}</h1>
          <p>{t("Please contact your administrator to get access")}</p>
        </div>
      </div>
    );
  }

  // Show only settings panel if styles are disabled
  if (isStylesDisabled) {
    return (
      <ErrorBoundary fallback={<FallbackError />} onError={onErrorFn}>
        <div className="no-scrollbar h-full max-h-min w-full overflow-y-auto">
          <BlockSettings key={selectedBlock?._id} />
          <br />
          <br />
        </div>
      </ErrorBoundary>
    );
  }

  // Show only styles panel if settings are disabled
  if (isSettingsDisabled) {
    return (
      <ErrorBoundary fallback={<FallbackError />} onError={onErrorFn}>
        <div className="no-scrollbar h-full max-h-min w-full overflow-y-auto overflow-x-hidden">
          <div className="flex w-full items-center justify-end">
            <ResetStylesButton />
          </div>
          <AiStylePrompt />
          <BlockStyling />
          <BlockAttributesToggle />
          <br />
          <br />
          <br />
        </div>
      </ErrorBoundary>
    );
  }

  const handleTabChange = (value: string) => {
    if (value === "settings" || value === "styles") {
      setActiveTab(value);
    }
  };

  // Show both tabs if both permissions are enabled
  return (
    <ErrorBoundary fallback={<FallbackError />} onError={onErrorFn}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-1 flex-col">
        <div className="flex items-center justify-between">
          <TabsList className="grid h-auto w-full grid-cols-2">
            <TabsTrigger value="settings" className="text-xs">
              {t("Settings")}
            </TabsTrigger>
            <TabsTrigger value="styles" className="text-xs">
              <div className="flex w-full items-center justify-between">
                <span className="w-[90%] text-center">{t("Styling")}</span>
                <span className="w-[10%]">
                  <ResetStylesButton />
                </span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="settings" className="no-scrollbar h-full max-h-min overflow-y-auto">
          <BlockSettings key={selectedBlock?._id} />
          <br />
          <br />
        </TabsContent>
        <TabsContent
          value="styles"
          className="no-scrollbar h-full max-h-min max-w-full overflow-y-auto overflow-x-hidden">
          <AiStylePrompt />
          <BlockStyling />
          <BlockAttributesToggle />
          <br />
          <br />
          <br />
        </TabsContent>
      </Tabs>
    </ErrorBoundary>
  );
};

export default SettingsPanel;
