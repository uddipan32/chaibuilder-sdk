import { lsBlocksAtom, lsThemeAtom } from "@/_demo/atoms-dev";
import { defaultShadcnPreset } from "@/_demo/THEME_PRESETS";
import { ChaiBlock, ChaiBuilderEditor, registerChaiSidebarPanel } from "@/core/main";
import "@/index.css";
import { SavePageData } from "@/types/chaibuilder-editor-props";
import { loadWebBlocks } from "@/web-blocks";
import { ChatBubbleIcon } from "@radix-ui/react-icons";
import { useAtom } from "jotai";
import { isArray, map, pick } from "lodash-es";
import { EXTERNAL_DATA } from "./_demo/EXTERNAL_DATA";
import { PARTIALS } from "./_demo/PARTIALS";
import { extendChaiBuilder } from "./extentions";
import { Button } from "./ui";

loadWebBlocks();
extendChaiBuilder();

registerChaiSidebarPanel("popover", {
  button: () => (
    <Button variant="ghost" size="icon">
      <ChatBubbleIcon />
    </Button>
  ),
  label: "Popover 2",
  position: "bottom",
});

function ChaiBuilderDefault() {
  const [blocks] = useAtom(lsBlocksAtom);
  const [theme, setTheme] = useAtom(lsThemeAtom);
  console.log("EDITOR 1");
  return (
    <ChaiBuilderEditor
      _tempProps={{
        librarySite: false,
      }}
      gotoPage={(args) => {
        console.log("gotoPage", args);
      }}
      permissions={null}
      // permissions={[]}
      pageExternalData={EXTERNAL_DATA}
      fallbackLang="en"
      languages={["fr"]}
      themePresets={[{ shadcn_default: defaultShadcnPreset }]}
      theme={theme}
      autoSave={true}
      autoSaveInterval={15}
      blocks={blocks}
      onSave={async ({ blocks, theme, needTranslations, domElements }: SavePageData) => {
        console.log("onSave", blocks, theme, needTranslations, domElements);
        console.log("HTML:", domElements);
        localStorage.setItem("chai-builder-blocks", JSON.stringify(blocks));
        localStorage.setItem("chai-builder-theme", JSON.stringify(theme));
        setTheme(theme);
        await new Promise((resolve) => setTimeout(resolve, 100));
        return true;
      }}
      askAiCallBack={async (type: "styles" | "content", prompt: string, blocks: ChaiBlock[], lang: string = "") => {
        console.log("askAiCallBack", type, prompt, blocks, lang);
        return {
          blocks: map(blocks, (b) => ({
            ...pick(b, ["_id"]),
          })),
          usage: { completionTokens: 151, promptTokens: 227, totalTokens: 378 },
        };
      }}
      getPartialBlockBlocks={async (partialBlockKey: string) => {
        const blocks = PARTIALS[partialBlockKey] ?? PARTIALS["header"];
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(blocks);
          }, 100);
        });
      }}
      getPartialBlocks={async () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              header: {
                type: "GlobalBlock",
                name: "Header",
                description: "Header",
              },
              footer: {
                type: "GlobalBlock",
                name: "Footer",
                description: "Footer",
              },
              partial: {
                type: "PartialBlock",
                name: "Partial Name here",
                description: "Partial",
              },
            });
          }, 1000);
        });
      }}
      pageTypes={[{ key: "page", name: "Pages" }]}
      searchPageTypeItems={async (pageTypeKey: string, query: string | string[]) => {
        console.log("searchPageTypeItems", pageTypeKey, query, "query");
        if (pageTypeKey === "page") {
          const items = [
            { id: "uuid-1", name: "Page 1", slug: "/page-1" },
            { id: "uuid-2", name: "Page 2" },
            { id: "uuid-3", name: "About", slug: "/about" },
            { id: "uuid-4", name: "Contact" },
          ];
          await new Promise((r) => setTimeout(r, 500));
          return items.filter((item) => {
            if (isArray(query)) return query?.includes(item.id);
            return item.name.toLowerCase().includes(query.toString().toLowerCase());
          });
        }
        return [];
      }}
      getBlockAsyncProps={async (args: { block: ChaiBlock }) => {
        console.log("getBlockAsyncProps", args);
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                items: Array.from({ length: 30 }, (_, i) => ({
                  name: `Promotion ${i + 1}`,
                  date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                  image: `https://picsum.photos/500/300`,
                })),
                totalItems: 30,
              }),
            2000,
          ),
        );
      }}
      collections={[
        {
          id: "promotions",
          name: "Promotions",
          description: "Promotions",
          filters: [
            {
              id: "filter-1",
              name: "Promotions Filter 1",
              description: "Promotions Filter 1",
            },
          ],
          sorts: [
            {
              id: "sort-1",
              name: "Promotions Sort 1",
              description: "Promotions Sort 1",
            },
          ],
        },
        {
          id: "vehicles",
          name: "Vehicles",
          description: "Vehicles",
          filters: [
            {
              id: "filter-1",
              name: "Vehicles Filter 1",
              description: "Vehicles Filter 1",
            },
          ],
          sorts: [
            {
              id: "sort-1",
              name: "Vehicles Sort 1",
              description: "Vehicles Sort 1",
            },
          ],
        },
      ]}
    />
  );
}

export default ChaiBuilderDefault;
