/**
 * Users author block attributes as HTML (`datetime`, `colspan`, `for`), but the
 * blocks render through `React.createElement`, which only recognises the
 * camelCase DOM-property spelling. Passing the HTML spelling makes React warn
 * ("Invalid DOM property `datetime`. Did you mean `dateTime`?") and drop the
 * attribute, so the authored markup silently loses it.
 *
 * Only attributes whose React name differs from their HTML name need mapping;
 * everything else (including `data-*`, `aria-*`, and every all-lowercase
 * single-word attribute) already passes through React untouched.
 */
const HTML_TO_REACT_ATTRIBUTE: Record<string, string> = {
  "accept-charset": "acceptCharset",
  accesskey: "accessKey",
  allowfullscreen: "allowFullScreen",
  autocapitalize: "autoCapitalize",
  autocomplete: "autoComplete",
  autocorrect: "autoCorrect",
  autofocus: "autoFocus",
  autoplay: "autoPlay",
  cellpadding: "cellPadding",
  cellspacing: "cellSpacing",
  charset: "charSet",
  class: "className",
  classid: "classID",
  colspan: "colSpan",
  contenteditable: "contentEditable",
  contextmenu: "contextMenu",
  controlslist: "controlsList",
  crossorigin: "crossOrigin",
  datetime: "dateTime",
  dirname: "dirName",
  enctype: "encType",
  enterkeyhint: "enterKeyHint",
  fetchpriority: "fetchPriority",
  for: "htmlFor",
  formaction: "formAction",
  formenctype: "formEncType",
  formmethod: "formMethod",
  formnovalidate: "formNoValidate",
  formtarget: "formTarget",
  frameborder: "frameBorder",
  hreflang: "hrefLang",
  "http-equiv": "httpEquiv",
  imagesizes: "imageSizes",
  imagesrcset: "imageSrcSet",
  inputmode: "inputMode",
  itemid: "itemID",
  itemprop: "itemProp",
  itemref: "itemRef",
  itemscope: "itemScope",
  itemtype: "itemType",
  keyparams: "keyParams",
  keytype: "keyType",
  marginheight: "marginHeight",
  marginwidth: "marginWidth",
  maxlength: "maxLength",
  mediagroup: "mediaGroup",
  minlength: "minLength",
  nomodule: "noModule",
  novalidate: "noValidate",
  playsinline: "playsInline",
  popovertarget: "popoverTarget",
  popovertargetaction: "popoverTargetAction",
  radiogroup: "radioGroup",
  readonly: "readOnly",
  referrerpolicy: "referrerPolicy",
  rowspan: "rowSpan",
  spellcheck: "spellCheck",
  srcdoc: "srcDoc",
  srclang: "srcLang",
  srcset: "srcSet",
  tabindex: "tabIndex",
  usemap: "useMap",
};

/**
 * Boolean DOM properties React expects as booleans. Authored attributes always
 * arrive as strings, and React renders `readOnly="false"` as a *present*
 * attribute — the opposite of what the author meant.
 */
const BOOLEAN_ATTRIBUTES = new Set([
  "allowFullScreen",
  "async",
  "autoFocus",
  "autoPlay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formNoValidate",
  "hidden",
  "itemScope",
  "loop",
  "multiple",
  "muted",
  "noModule",
  "noValidate",
  "open",
  "playsInline",
  "readOnly",
  "required",
  "reverse",
  "selected",
]);

/**
 * Rewrites author-supplied HTML attribute names to their React DOM property
 * names. Unknown keys pass through untouched so `data-*`, `aria-*`, and custom
 * attributes keep working.
 */
export function toReactDomAttributes(attrs: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const key of Object.keys(attrs)) {
    const reactKey = HTML_TO_REACT_ATTRIBUTE[key.toLowerCase()] ?? key;
    const value = attrs[key];
    normalized[reactKey] =
      BOOLEAN_ATTRIBUTES.has(reactKey) && typeof value === "string" ? value !== "false" : value;
  }
  return normalized;
}
