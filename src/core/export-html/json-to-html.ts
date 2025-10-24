import React from "react";
import ReactDOMServer from "react-dom/server";

export const getHTMLFromBlocks = async (blocks: any, theme: any): Promise<string> => {
  // Validate inputs
  if (!blocks || !Array.isArray(blocks)) {
    throw new Error("Blocks must be a valid array");
  }
  
  // Import the necessary functions for server-side rendering
  const { getChaiThemeCssVariables, getStylesForBlocks, RenderChaiBlocks } = await import("@/render");
  const { getMergedPartialBlocks } = await import("@/render/functions");
  
  // Generate styles server-side
  const allStyles = await getStylesForBlocks(blocks, true);
  const themeVars = getChaiThemeCssVariables(theme);

  const element = React.createElement(
    React.Fragment,
    null,
    React.createElement('style', null, themeVars),
    React.createElement('style', null, allStyles),
    React.createElement(RenderChaiBlocks, {
      lang: "fr",
      fallbackLang: "en",
      externalData: {
        // ...EXTERNAL_DATA,
        "#promotions/ppqlwb": [
          { name: "Promotion 1", date: "2025-05-19", image: "https://picsum.photos/500/300" },
          { name: "Promotion 2", date: "2025-05-20", image: "https://picsum.photos/500/310" },
        ],
      },
      pageProps: { slug: "chai-builder" },
      draft: true,
      blocks: getMergedPartialBlocks(blocks, null),
      dataProviderMetadataCallback: (block: any, meta: any) => {
        console.log("meta", meta);
        console.log("block", block);
      }
    })
  );

  const htmlString = ReactDOMServer.renderToString(element);
  return htmlString;
};