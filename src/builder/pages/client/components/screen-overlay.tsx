import { Button } from "../../../../components/ui/button";
import { BlurContainer } from "../../../../components/ui/loader";

interface ScreenOverlayProps {
  hasDynamicPage: boolean;
  isLangMissing?: boolean;
  /** Set when the selected identifier resolved to no content. */
  isDataMissing?: boolean;
  /** Message from a data provider that threw while resolving the identifier. */
  dataError?: string;
  /** The identifier that failed, shown so the user knows what to correct. */
  identifier?: string;
  /** A lookup that came back empty, offered as a typed identifier instead. */
  failedIdentifier?: string;
  /** Opens `failedIdentifier` without verifying it exists. */
  onOpenAnyway?: () => void;
}

const resolveContent = ({
  hasDynamicPage,
  isLangMissing,
  isDataMissing,
  dataError,
  identifier,
}: ScreenOverlayProps): { title: string; message: string } => {
  if (dataError) {
    return {
      title: "Could not load page data",
      message: identifier ? `Loading "${identifier}" failed: ${dataError}` : dataError,
    };
  }

  if (isDataMissing) {
    return {
      title: "No content found",
      message: identifier
        ? `Nothing matches "${identifier}" for the selected language. Pick another page, or enter a different identifier in the header.`
        : "Nothing matches this identifier for the selected language. Pick another page from the header.",
    };
  }

  if (isLangMissing) {
    return {
      title: "Language content missing",
      message:
        "No translated version found for the selected page. Choose a different page or create content in your CMS.",
    };
  }

  if (!hasDynamicPage) {
    return {
      title: "No pages found",
      message: "Add a new page, or type a slug or identifier in the page selector above to open it directly.",
    };
  }

  return {
    title: "Select a page",
    message: "Please select a page from the list in the top header. This will enable you to edit the page.",
  };
};

export const ScreenOverlay = (props: ScreenOverlayProps) => {
  const { failedIdentifier, onOpenAnyway, isDataMissing, dataError } = props;
  const { title, message } = resolveContent(props);
  // Only worth offering while the page hasn't been opened — once it is, an empty
  // result is exactly what the overlay is already reporting.
  const canOpenAnyway = !!onOpenAnyway && !!failedIdentifier && !isDataMissing && !dataError;

  return (
    <BlurContainer>
      <div className="flex min-w-[300px] max-w-[400px] flex-col items-center justify-center rounded-lg border bg-surface p-4 shadow-lg">
        <h1 className="text-lg font-medium">{title}</h1>
        <p className="pt-2 text-center text-sm font-light text-muted-foreground">{message}</p>
        {canOpenAnyway && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onOpenAnyway}>
            Open &quot;{failedIdentifier}&quot; anyway
          </Button>
        )}
      </div>
    </BlurContainer>
  );
};

export default ScreenOverlay;
