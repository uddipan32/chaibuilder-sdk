import type { GetAssetInput, SearchImagesInput, UpdateAssetInput } from "~/types/media";
import { dispatchChaiAction } from "~/server/chai-actions/dispatch-action";
import type {
  DeleteLibraryItemActionData,
  GetLibraryItemActionData,
  GetLibraryItemsActionData,
  UpsertLibraryItemActionData,
} from "~/types/library";
import { CreatePageActionData } from "~/server/chai-actions/pages/create-page";
import { DeletePageActionData } from "~/server/chai-actions/pages/delete-page";
import { DuplicatePageActionData } from "~/server/chai-actions/pages/duplicate-page";
import { GetWebsitePagesActionData } from "~/server/chai-actions/pages/get-website-pages";
import { TakeOfflineActionData } from "~/server/chai-actions/pages/take-offline";
import { UpdatePageActionData } from "~/server/chai-actions/pages/update-page";
import { UpdatePageMetadataActionData } from "~/server/chai-actions/pages/update-page-metadata";
import type {
  DeletePageRevisionActionData,
  GetPageRevisionsActionData,
  GetRevisionPageActionData,
  RestorePageActionData,
} from "~/types/revisions";
import type {
  CreateRoleActionData,
  DeleteRoleActionData,
  GetRoleActionData,
  UpdateRoleActionData,
} from "~/types/roles";
import { GetTemplatesByTypeActionData } from "~/server/chai-actions/templates/get-templates-by-type";
import { MarkAsTemplateActionData } from "~/server/chai-actions/templates/mark-as-template";
import { UnmarkAsTemplateActionData } from "~/server/chai-actions/templates/unmark-as-template";
import type {
  DeletePermanentlyData,
  GetTrashedItemsData,
  PermanentlyDeleteByDaysData,
  RestoreTrashedItemData,
  TrashEntityData,
} from "~/types/trash";

export const runRegisteredAction = async <T>(actionName: string, data: T): Promise<any> => {
  return dispatchChaiAction(actionName, data);
};

// Assets
export const getAsset = (data: GetAssetInput) => runRegisteredAction("GET_ASSET", data);
export const getAssets = (data: { search?: string; page?: number; limit?: number } = {}) =>
  runRegisteredAction("GET_ASSETS", data);
export const searchImages = (data: SearchImagesInput) => runRegisteredAction("SEARCH_IMAGES", data);
export const updateAsset = (data: UpdateAssetInput) => runRegisteredAction("UPDATE_ASSET", data);

// Pages
export const createPage = (data: CreatePageActionData) => runRegisteredAction("CREATE_PAGE", data);
export const deletePage = (data: DeletePageActionData) => runRegisteredAction("DELETE_PAGE", data);
export const duplicatePage = (data: DuplicatePageActionData) => runRegisteredAction("DUPLICATE_PAGE", data);
export const getWebsitePages = (data: GetWebsitePagesActionData) => runRegisteredAction("GET_WEBSITE_PAGES", data);
export const takeOffline = (data: TakeOfflineActionData) => runRegisteredAction("TAKE_OFFLINE", data);
export const updatePage = (data: UpdatePageActionData) => runRegisteredAction("UPDATE_PAGE", data);
export const updatePageMetadata = (data: UpdatePageMetadataActionData) =>
  runRegisteredAction("UPDATE_PAGE_METADATA", data);

// Libraries
export const getLibraries = () => runRegisteredAction("GET_LIBRARIES", {});
export const getLibraryGroups = () => runRegisteredAction("GET_LIBRARY_GROUPS", {});

// Library Items
export const deleteLibraryItem = (data: DeleteLibraryItemActionData) =>
  runRegisteredAction("DELETE_LIBRARY_ITEM", data);
export const getLibraryItem = (data: GetLibraryItemActionData) => runRegisteredAction("GET_LIBRARY_ITEM", data);
export const getLibraryItems = (data: GetLibraryItemsActionData) => runRegisteredAction("GET_LIBRARY_ITEMS", data);
export const upsertLibraryItem = (data: UpsertLibraryItemActionData) =>
  runRegisteredAction("UPSERT_LIBRARY_ITEM", data);

// Templates
export const getTemplatesByType = (data: GetTemplatesByTypeActionData) =>
  runRegisteredAction("GET_TEMPLATES_BY_TYPE", data);
export const markAsTemplate = (data: MarkAsTemplateActionData) => runRegisteredAction("MARK_AS_TEMPLATE", data);
export const unmarkAsTemplate = (data: UnmarkAsTemplateActionData) => runRegisteredAction("UNMARK_AS_TEMPLATE", data);

// Trash
export const deleteTrashedItemPermanently = (data: DeletePermanentlyData) =>
  runRegisteredAction("DELETE_PERMANENTLY", data);
export const getTrashedItems = (data: GetTrashedItemsData) => runRegisteredAction("GET_TRASHED_ITEMS", data);
export const permanentlyDeleteByDays = (data: PermanentlyDeleteByDaysData) =>
  runRegisteredAction("PERMANENTLY_DELETE_BY_DAYS", data);
export const restoreTrashedItem = (data: RestoreTrashedItemData) => runRegisteredAction("RESTORE_TRASHED_ITEM", data);
export const trashEntity = (data: TrashEntityData) => runRegisteredAction("TRASH_ENTITY", data);

// Roles
export const getRoles = () => runRegisteredAction("GET_ROLES", {});
export const getRole = (data: GetRoleActionData) => runRegisteredAction("GET_ROLE", data);
export const createRole = (data: CreateRoleActionData) => runRegisteredAction("CREATE_ROLE", data);
export const updateRole = (data: UpdateRoleActionData) => runRegisteredAction("UPDATE_ROLE", data);
export const deleteRole = (data: DeleteRoleActionData) => runRegisteredAction("DELETE_ROLE", data);

// Revisions
export const deletePageRevision = (data: DeletePageRevisionActionData) =>
  runRegisteredAction("DELETE_PAGE_REVISION", data);
export const getPageRevisions = (data: GetPageRevisionsActionData) => runRegisteredAction("GET_PAGE_REVISIONS", data);
export const getRevisionPage = (data: GetRevisionPageActionData) => runRegisteredAction("GET_REVISION_PAGE", data);
export const restorePage = (data: RestorePageActionData) => runRegisteredAction("RESTORE_PAGE_REVISION", data);
