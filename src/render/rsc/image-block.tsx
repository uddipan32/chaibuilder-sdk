import { first, isArray } from "lodash-es";
import Image from "next/image";
import * as React from "react";
import { ChaiBlockComponentProps, ChaiBlockStyles } from "~/types";

export const ImageBlock = (
  props: ChaiBlockComponentProps<{
    height: string;
    width: string;
    alt: string;
    styles: ChaiBlockStyles;
    lazyLoading: boolean;
    image: string;
  }>,
): React.ReactElement | null => {
  const { image, styles, alt, height, width, lazyLoading } = props;

  // If width or height are missing/invalid, use fill mode
  const shouldUseFill = !width || !height || isNaN(parseInt(width)) || isNaN(parseInt(height));

  // Trim both ends: a binding authored with stray whitespace (`" {{logo}}"`)
  // keeps it, because the binding engine renders with autoTrim off. When the
  // binding resolves to nothing that leaves whitespace only, which is truthy —
  // render nothing rather than an empty `src`, which makes the browser refetch
  // the whole page.
  const src = (isArray(image) ? first(image) : image)?.trim();

  if (!src) return null;

  const imageElement = React.createElement(Image, {
    ...styles,
    src,
    alt: alt || "",
    priority: !lazyLoading,
    loading: lazyLoading ? "lazy" : "eager",
    fill: shouldUseFill,
    height: shouldUseFill ? undefined : parseInt(height),
    width: shouldUseFill ? undefined : parseInt(width),
    style: shouldUseFill ? { objectFit: "cover" } : undefined,
    unoptimized: false, // Disable Next.js image optimization to avoid issues with external URLs
  });

  if (shouldUseFill) {
    return React.createElement("div", { className: "relative flex w-full h-full" }, imageElement);
  }

  return imageElement;
};
