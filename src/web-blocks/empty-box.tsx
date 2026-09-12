import * as React from "react";
import { registerChaiBlockProps, stylesProp } from "~/registry";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";
import { backgroundImageQualityProp } from "~/web-blocks/image-quality-prop";

export type EmptyBoxProps = {
  styles: ChaiStyles;
  backgroundImage: string;
  imageQuality?: string;
};

const EmptyBox = (props: ChaiBlockComponentProps<EmptyBoxProps>) => {
  const { blockProps, styles, backgroundImage } = props;
  let cssStyles = {};
  if (backgroundImage) {
    cssStyles = { backgroundImage: `url(${backgroundImage})` };
  }
  return React.createElement("div", {
    ...blockProps,
    ...styles,
    style: cssStyles,
  });
};

const Config = {
  type: "EmptyBox",
  description: "A box component with no children",
  label: "Empty Box",
  category: "core",
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      styles: stylesProp(""),
      backgroundImage: {
        type: "string",
        title: "Background Image",
        default: "",
        ui: { "ui:widget": "image", "ui:allowEmpty": true },
      },
      // Optimization for the background image. Default is "raw" (unchanged), so
      // it is opt-in. The app-side render override (blocks/rsc/EmptyBox.tsx)
      // applies it via resolveBackgroundImageUrl; the editor preview stays raw.
      imageQuality: backgroundImageQualityProp,
    },
  }),
};

export { EmptyBox as Component, Config };
