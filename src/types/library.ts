import type { ChaiBlock } from "~/types/common";

// Action data shapes — declared here (not in the library plugin's action files) so the
// typed `getChaiBuilder` instance API can reference them without importing plugin code.
export type GetLibraryItemActionData = {
  id: string;
};

export type GetLibraryItemsActionData = {
  id: string; // library id
};

export type DeleteLibraryItemActionData = {
  id: string;
};

export type UpsertLibraryItemActionData = {
  name: string;
  group: string;
  blocks: ChaiBlock[];
  description?: string;
  previewImage?: string;
  id?: string;
  previewImageUrl?: string; // Pre-uploaded image URL (if already handled externally)
};
