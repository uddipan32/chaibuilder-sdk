import { useAtom } from "jotai";
import { each, noop, omit } from "lodash-es";
import React, { useEffect, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Toaster } from "sonner";
import { chaiBuilderPropsAtom, chaiDesignTokensAtom, chaiPageExternalDataAtom } from "~/builder/atoms/builder";
import { builderStore } from "~/builder/atoms/store";
import { selectedLibraryAtom } from "~/builder/atoms/ui";
import { FallbackError } from "~/builder/core/components/fallback-error";
import { PreviewScreen } from "~/builder/core/components/PreviewScreen";
import { useAutoSave } from "~/builder/core/components/use-auto-save";
import { ChaiFeatureFlagsWidget } from "~/builder/core/flags/flags-widget";
import { setDebugLogs } from "~/builder/core/functions/logging";
import i18n from "~/builder/core/locales/load";
import { ScreenTooSmall } from "~/builder/core/screen-too-small";
import { useBlocksStore } from "~/builder/hooks/history/use-blocks-store-undoable-actions";
import { useBlockSelectionQuerySync } from "~/builder/hooks/use-block-selection-query-sync";
import { useBroadcastChannel, useUnmountBroadcastChannel } from "~/builder/hooks/use-broadcast-channel";
import { useBuilderReset } from "~/builder/hooks/use-builder-reset";
import { useCheckStructure } from "~/builder/hooks/use-check-structure";
import { useExpandTree } from "~/builder/hooks/use-expand-tree";
import { isPageLoadedAtom } from "~/builder/hooks/use-is-page-loaded";
import { useKeyEventWatcher } from "~/builder/hooks/use-key-event-watcher";
import { useWatchPartialBlocks } from "~/builder/hooks/use-partial-blocks-store";
import { builderSaveStateAtom } from "~/builder/hooks/use-save-page";
import { CHAI_SLOT_IDS, ChaiSlot } from "~/builder/register-apis";
import { syncBlocksWithDefaultProps } from "~/registry";
import { ChaiBuilderEditorProps } from "~/types";
import { ProRootLayout } from "./layout/pro-root-layout";

const ChaiWatchers = (props: ChaiBuilderEditorProps) => {
  const [, setAllBlocks] = useBlocksStore();
  const reset = useBuilderReset();
  const [saveState] = useAtom(builderSaveStateAtom);
  useAtom(selectedLibraryAtom);
  useKeyEventWatcher();
  useExpandTree();
  useBlockSelectionQuerySync();
  useAutoSave();
  useWatchPartialBlocks();
  useUnmountBroadcastChannel();
  const { postMessage } = useBroadcastChannel();
  const [, setIsPageLoaded] = useAtom(isPageLoadedAtom);
  const runValidation = useCheckStructure();

  useEffect(() => {
    builderStore.set(chaiBuilderPropsAtom, omit(props, ["blocks", "translations", "pageExternalData", "globalStyles"]));
  }, [props]);

  useEffect(() => {
    builderStore.set(chaiPageExternalDataAtom, props.pageExternalData || {});
  }, [props.pageExternalData]);

  useEffect(() => {
    builderStore.set(chaiDesignTokensAtom, props.designTokens || {});
  }, [props.designTokens]);

  useEffect(() => {
    setIsPageLoaded(false);
    // Added delay to allow the pageId to be set
    setTimeout(() => {
      const withDefaults = syncBlocksWithDefaultProps(props.blocks || []);
      setAllBlocks(withDefaults);
      if (withDefaults && withDefaults.length > 0) {
        postMessage({ type: "blocks-updated", blocks: withDefaults });
      }
      reset();
      setIsPageLoaded(true);
      runValidation();
    }, 400);
  }, [props.blocks]);

  useEffect(() => {
    i18n.changeLanguage(props.locale || "en");
  }, [props.locale]);

  useEffect(() => {
    setDebugLogs(props.debugLogs ?? false);
  }, [props.debugLogs]);

  useEffect(() => {
    if (!props.translations) return;
    each(props.translations, (translations: any, lng: string) => {
      i18n.addResourceBundle(lng, "translation", translations, true, true);
    });
  }, [props.translations]);

  useEffect(() => {
    if (saveState !== "SAVED") {
      window.onbeforeunload = () => "";
    } else {
      window.onbeforeunload = null;
    }

    return () => {
      window.onbeforeunload = null;
    };
  }, [saveState]);
  return null;
};

const ChaiBuilderComponent = (props: ChaiBuilderEditorProps) => {
  const RootLayoutComponent = useMemo(() => props.layout || ProRootLayout, [props.layout]);
  return (
    <>
      {props.children}
      <RootLayoutComponent />
      <ChaiSlot slotId={CHAI_SLOT_IDS.AFTER_BUILDER} />
    </>
  );
};
/**
 * ChaiBuilder is the main entry point for the Chai Builder Studio.
 */
const ChaiBuilderEditor: React.FC<ChaiBuilderEditorProps> = (props: ChaiBuilderEditorProps) => {
  const onErrorFn = props.onError || noop;
  return (
    <div className="h-screen w-screen">
      <ErrorBoundary fallback={<FallbackError />} onError={onErrorFn}>
        <ScreenTooSmall />
        <ChaiBuilderComponent {...props} />
        <ChaiWatchers {...props} />
        <PreviewScreen />
        <Toaster richColors />
        <ChaiFeatureFlagsWidget />
      </ErrorBoundary>
    </div>
  );
};

export { ChaiBuilderEditor };
