import { noop } from "lodash-es";
import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import StaticCanvas from "~/builder/core/components/canvas/static/static-canvas";
import { FallbackError } from "~/builder/core/components/fallback-error";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { useCodeEditor } from "~/builder/hooks/use-code-editor";
import { Skeleton } from "~/components/ui/skeleton";
import { CanvasTopBar } from "./topbar/canvas-top-bar";

const CodeEditor = React.lazy(() => import("~/builder/core/components/canvas/static/code-editor"));

const CanvasArea: React.FC = () => {
  const [codeEditor] = useCodeEditor();
  const onErrorFn = useBuilderProp("onError", noop);
  return (
    <div className="flex h-full max-h-full w-full flex-1 flex-col">
      <div className="relative flex h-full max-h-full flex-col overflow-hidden">
        <CanvasTopBar />
        <Suspense fallback={<Skeleton className="h-full" />}>
          <ErrorBoundary fallback={<FallbackError />} onError={onErrorFn}>
            <StaticCanvas />
          </ErrorBoundary>
        </Suspense>
        {codeEditor ? (
          <Suspense fallback={<Skeleton className="h-full" />}>
            <CodeEditor />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
};

export default CanvasArea;
