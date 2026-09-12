import { parse, stringify } from "himalaya";

type HimalayaNode = {
  type: "element" | "text" | "comment";
  tagName?: string;
  attributes?: Array<{ key: string; value: string }>;
  children?: HimalayaNode[];
  content?: string;
};

/**
 * Extract the outerHTML of the blocks whose `bid` attribute is in `blockIds`
 * from the full page HTML (web-component representation sent by the client).
 * Descendants of a matched node are not searched again — the slice already
 * contains them.
 */
export const extractBlockHtmlSlices = (pageHtml: string, blockIds: string[]): Record<string, string> => {
  const wanted = new Set(blockIds);
  const found: Record<string, string> = {};

  const noteDescendantBids = (parentBid: string, node: HimalayaNode) => {
    const stack = [...(node.children ?? [])];
    while (stack.length) {
      const current = stack.pop();
      if (!current || current.type !== "element") continue;
      const childBid = current.attributes?.find((attr) => attr.key === "bid")?.value;
      if (childBid && wanted.has(childBid)) {
        found[childBid] =
          `NOTE: bid "${childBid}" is inside block "${parentBid}" which was already returned. ` +
          `Use the "${parentBid}" HTML slice to edit it, or request only "${childBid}".`;
        wanted.delete(childBid);
      }
      if (current.children?.length) stack.push(...current.children);
    }
  };

  const visit = (node: HimalayaNode) => {
    if (wanted.size === 0) return;
    if (node.type !== "element") return;
    const bid = node.attributes?.find((attr) => attr.key === "bid")?.value;
    if (bid && wanted.has(bid)) {
      found[bid] = stringify([node]);
      wanted.delete(bid);
      noteDescendantBids(bid, node);
      return;
    }
    node.children?.forEach(visit);
  };

  // himalaya throws on malformed/partial HTML. Callers (read_block_html and the
  // builder tool that shares this helper) expect a per-bid result map, so turn
  // a parse failure into actionable per-bid errors instead of letting it escape
  // as an unhandled exception.
  let nodes: HimalayaNode[];
  try {
    nodes = parse(pageHtml) as HimalayaNode[];
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const errors: Record<string, string> = {};
    for (const id of wanted) {
      errors[id] = `ERROR: could not parse the page HTML (${reason}).`;
    }
    return errors;
  }

  nodes.forEach(visit);

  for (const id of wanted) {
    found[id] = `ERROR: no block found with bid "${id}". Check the page outline for valid bids.`;
  }
  return found;
};
