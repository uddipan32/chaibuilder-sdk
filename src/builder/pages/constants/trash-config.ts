export type TrashLabels = {
  sidebarButton: string; // "Trash" | "Archive" | "Recycle Bin"
  panelTitle: string; // "Trash" | "Archive"
  moveToAction: string; // "Move to Trash" | "Archive"
  restoreAction: string; // "Restore"
  deleteAction: string; // "Delete Permanently"
  emptyMessage: string; // "Trash is empty"
  confirmMoveTitle: string; // "Move to Trash?"
  confirmDeleteTitle: string; // "Delete Permanently?"
  panelId: string;
  panelLabel: string;
  byLabel: string; // "Trashed by" | "Archived by"
  onLabel: string; // "Trashed on" | "Archived on"
  warning: string;
};

export const DEFAULT_TRASH_LABELS: TrashLabels = {
  sidebarButton: "Trash",
  panelTitle: "Trash",
  moveToAction: "Move to Trash",
  restoreAction: "Restore",
  deleteAction: "Delete Permanently",
  emptyMessage: "Trash is empty",
  confirmMoveTitle: "Move to Trash?",
  confirmDeleteTitle: "Delete Permanently?",
  panelId: "trash-panel",
  panelLabel: "Trash",
  byLabel: "Trashed by",
  onLabel: "Trashed on",
  warning: "Trashing",
};

let _trashLabels = { ...DEFAULT_TRASH_LABELS };

export const setTrashLabels = (labels: Partial<TrashLabels>) => {
  _trashLabels = { ...DEFAULT_TRASH_LABELS, ...labels };
};

export const getTrashLabels = () => _trashLabels;
