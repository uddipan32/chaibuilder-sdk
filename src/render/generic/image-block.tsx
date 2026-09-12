import { first, isArray } from "lodash-es";
import * as React from "react";
import { ChaiBlockComponentProps, ChaiBlockStyles } from "~/types";

export const GenericImageBlock = (
  props: ChaiBlockComponentProps<{
    height: string;
    width: string;
    alt: string;
    styles: ChaiBlockStyles;
    lazyLoading: boolean;
    image: string;
  }>,
): React.ReactElement => {
  const { image, styles, alt, height, width, lazyLoading } = props;

  const shouldUseFill = !width || !height || isNaN(parseInt(width)) || isNaN(parseInt(height));
  const src = isArray(image) ? first(image)?.trimEnd() : image?.trimEnd();

  const imageElement = React.createElement("img", {
    ...styles,
    src,
    alt: alt || "",
    loading: lazyLoading ? "lazy" : "eager",
    height: shouldUseFill ? undefined : parseInt(height),
    width: shouldUseFill ? undefined : parseInt(width),
    style: shouldUseFill ? { objectFit: "cover" } : undefined,
  });

  if (shouldUseFill) {
    return React.createElement("div", { className: "relative flex w-full h-full" }, imageElement);
  }

  return imageElement;
};
