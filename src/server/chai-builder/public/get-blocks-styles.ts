import twContainer from "@tailwindcss/container-queries";
import twForms from "@tailwindcss/forms";
import twTypography from "@tailwindcss/typography";
import type { ChaiBlock } from "~/types";
import { getChaiBuilderTheme } from "~/utils";
// Compat entry (not ~/tailwind): shared compile path used by the server styles pipeline for
// v4 consumers of the published package.
import { compileTailwindCss } from "~/utils/tailwind-css-compat";
import { blocksToStylesMarkup } from "./styles-markup";

export const getBlocksStyles = async (blocks: ChaiBlock[]): Promise<string> => {
  return compileTailwindCss({
    markupStrings: [blocksToStylesMarkup(blocks)],
    includeBaseStyles: false,
    config: {
      darkMode: "class",
      theme: {
        extend: {
          ...getChaiBuilderTheme(),
          keyframes: {
            "accordion-down": {
              from: {
                height: "0",
              },
              to: {
                height: "var(--radix-accordion-content-height)",
              },
            },
            "accordion-up": {
              from: {
                height: "var(--radix-accordion-content-height)",
              },
              to: {
                height: "0",
              },
            },
          },
          animation: {
            "accordion-down": "accordion-down 0.2s ease-out",
            "accordion-up": "accordion-up 0.2s ease-out",
          },
        },
      },
      plugins: [twForms, twTypography, twContainer],
      corePlugins: { preflight: false },
    },
  });
};
