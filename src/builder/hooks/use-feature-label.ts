import { useTranslation } from "react-i18next";
import { ChaiBuilderEditorProps } from "~/types/chaibuilder-editor-props";
import { useBuilderProp } from "./use-builder-prop";

type FeatureKey = "designTokens" | "trash" | "dataBinding" | "ai";

const DEFAULT_LABELS: Record<FeatureKey, string> = {
  designTokens: "Design Tokens",
  trash: "Trash",
  dataBinding: "Data Binding",
  ai: "AI",
};

export function useFeatureLabel(featureKey: FeatureKey): string {
  const { i18n } = useTranslation();
  const labels = useBuilderProp<ChaiBuilderEditorProps["labels"]>("labels", undefined);
  const locale = useBuilderProp<string>("locale", "en");

  const customLabel = labels?.features?.[featureKey];

  if (customLabel) {
    if (typeof customLabel === "string") {
      return customLabel;
    }

    if (typeof customLabel === "object") {
      return (
        customLabel[locale] ||
        customLabel[i18n.language] ||
        customLabel["en"] ||
        customLabel[Object.keys(customLabel)[0]] ||
        DEFAULT_LABELS[featureKey]
      );
    }
  }

  return DEFAULT_LABELS[featureKey];
}
