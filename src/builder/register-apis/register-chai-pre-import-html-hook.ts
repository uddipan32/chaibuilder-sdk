let PRE_IMPORT_HTML_HOOK = async (code: string) => code;

const registerChaiPreImportHTMLHook = (fn: (code: string) => Promise<string>) => {
  PRE_IMPORT_HTML_HOOK = fn;
};

export const getPreImportHTML = async (code: string) => await PRE_IMPORT_HTML_HOOK(code);

export { registerChaiPreImportHTMLHook };
