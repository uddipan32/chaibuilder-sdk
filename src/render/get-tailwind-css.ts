import { chaiBuilderPlugin, getChaiBuilderTheme } from "@/tailwind";
import { ChaiBlock } from "@/types/chai-block";
import { createTailwindcss } from "@mhsdesign/jit-browser-tailwindcss";
import twAspectRatio from "@tailwindcss/aspect-ratio";
import twContainer from "@tailwindcss/container-queries";
import twForms from "@tailwindcss/forms";
import twTypography from "@tailwindcss/typography";

async function getTailwindCSS(markupString: string[], safelist: string[] = [], includeBaseStyles: boolean = false) {
  const tailwind = createTailwindcss({
    tailwindConfig: {
      darkMode: "class",
      safelist,
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
      plugins: [twForms, twTypography, twAspectRatio, twContainer, chaiBuilderPlugin],
      corePlugins: { preflight: includeBaseStyles },
    },
  });

  return await tailwind.generateStylesFromContent(
    ` ${includeBaseStyles ? "@tailwind base;" : ""}
      @tailwind components;
      @tailwind utilities;`,
    markupString,
  );
}

/**
 * Get the tailwind css for the blocks
 * @param blocks - The blocks to get the tailwind css for
 * @param includeBaseStyles - Whether to include the base styles
 * @returns The tailwind css for the blocks
 */
const getBlocksTailwindCSS = (blocks: ChaiBlock[], includeBaseStyles: boolean) => {
  if (!blocks || !Array.isArray(blocks)) {
    return getTailwindCSS([""], [], includeBaseStyles);
  }
  
  const blocksString = JSON.stringify(blocks).replace(/#styles:([^"]*)/g, (_match, content) => {
    return `#styles:${content.replace(/,/g, " ")}`.replace(/#styles:/g, "");
  });
  return getTailwindCSS([blocksString], [], includeBaseStyles);
};

/**
 * Get the tailwind css for the blocks
 * @param blocks - The blocks to get the tailwind css for
 * @param includeBaseStyles - Whether to include the base styles
 * @returns The tailwind css for the blocks
 */
export const getStylesForBlocks = async (blocks: ChaiBlock[], includeBaseStyles: boolean = false): Promise<string> => {
  return await getBlocksTailwindCSS(blocks, includeBaseStyles);
};
