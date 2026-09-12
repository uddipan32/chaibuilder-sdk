import { parse, stringify, type HimalayaNode } from "himalaya";
import Script from "next/script";

type Attributes = { [key: string]: string };

interface MetaElement {
  key: string;
  attributes: Attributes;
}

interface LinkElement {
  key: string;
  attributes: Attributes;
}

interface ScriptElement {
  key: string;
  src: string;
  content: string;
  attributes: Attributes;
}

interface StyleElement {
  key: string;
  content: string;
}

interface HeadElements {
  metas: MetaElement[];
  scripts: ScriptElement[];
  links: LinkElement[];
  styles: StyleElement[];
}

function getAttributes(node: HimalayaNode): Attributes {
  const attributes: Attributes = {};
  for (const { key, value } of node.attributes || []) {
    attributes[key] = value ?? "";
  }
  return attributes;
}

function getInnerContent(node: HimalayaNode): string {
  return stringify(node.children || []);
}

function walk(nodes: HimalayaNode[], visit: (node: HimalayaNode) => void) {
  for (const node of nodes) {
    if (node.type !== "element") continue;
    visit(node);
    if (node.children?.length) walk(node.children, visit);
  }
}

export function parseHeadElements(htmlString: string): HeadElements {
  const nodes = parse(htmlString);

  const headElements: HeadElements = {
    metas: [],
    scripts: [],
    links: [],
    styles: [],
  };

  walk(nodes, (node) => {
    switch (node.tagName) {
      case "meta":
        headElements.metas.push({ key: `meta-${headElements.metas.length}`, attributes: getAttributes(node) });
        break;
      case "link":
        headElements.links.push({ key: `link-${headElements.links.length}`, attributes: getAttributes(node) });
        break;
      case "style":
        headElements.styles.push({ key: `style-${headElements.styles.length}`, content: getInnerContent(node) });
        break;
      case "script": {
        const attributes = getAttributes(node);
        const src = attributes.src || "";
        delete attributes.src;
        headElements.scripts.push({
          key: `script-${headElements.scripts.length}`,
          src,
          content: getInnerContent(node),
          attributes,
        });
        break;
      }
    }
  });

  return headElements;
}

export async function ChaiCustomHtml({ htmlHeadString }: { htmlHeadString: string }) {
  const headElements = parseHeadElements(htmlHeadString);
  return (
    <>
      {headElements.metas.map((meta) => (
        <meta key={meta.key} {...meta.attributes} />
      ))}
      {headElements.links.map((link) => (
        <link key={link.key} {...link.attributes} />
      ))}
      {headElements.styles.map((style) => (
        <style key={style.key} dangerouslySetInnerHTML={{ __html: style.content }} />
      ))}
      {headElements.scripts.map((script) =>
        script.src ? (
          <Script key={script.key} src={script.src} {...script.attributes} />
        ) : (
          <Script key={script.key} dangerouslySetInnerHTML={{ __html: script.content }} {...script.attributes} />
        ),
      )}
    </>
  );
}
