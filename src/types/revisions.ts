/**
 * Revision action data shapes. Declared in core so the typed `getChaiBuilder`
 * instance API can reference them without importing plugin code.
 */

export type GetPageRevisionsActionData = {
  pageId: string;
};

export type GetRevisionPageActionData = {
  id: string;
  type: "draft" | "live" | "revision";
  lang?: string;
};

export type RestorePageActionData = {
  revisionId: string;
  discardCurrent: boolean;
  pageId?: string;
};

export type DeletePageRevisionActionData = {
  revisionId: string;
};
