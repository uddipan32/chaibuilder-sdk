import { lsBlocksAtom } from "@/_demo/atoms-dev";
import CustomLayout from "@/_demo/custom-layout";
import PreviewWeb from "@/_demo/preview/web-preview";
import { ChaiBlock, ChaiBuilderEditor } from "@/core/main";
import { loadWebBlocks } from "@/web-blocks";
import { useAtom } from "jotai";
loadWebBlocks();

function ChaiBuilderCustom() {
  const [blocks] = useAtom(lsBlocksAtom);
  console.log("EDITOR 2");

  return (
    <ChaiBuilderEditor
      locale={"pt-BR"}
      // translations={{ "pt-BR": ptBR, es: es }}
      layout={CustomLayout}
      debugLogs={true}
      autoSave={false}
      previewComponent={PreviewWeb}
      blocks={blocks}
      onSave={async ({ blocks, providers, brandingOptions }: any) => {
        localStorage.setItem("chai-builder-blocks", JSON.stringify(blocks));
        localStorage.setItem("chai-builder-providers", JSON.stringify(providers));
        localStorage.setItem("chai-builder-branding-options", JSON.stringify(brandingOptions));
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return true;
      }}
      askAiCallBack={async (type: "styles" | "content", prompt: string, blocks: ChaiBlock[]) => {
        console.log("askAiCallBack", type, prompt, blocks);
        return new Promise((resolve) => resolve({ error: new Error("Not implemented") }));
      }}
    />
  );
}

export default ChaiBuilderCustom;
