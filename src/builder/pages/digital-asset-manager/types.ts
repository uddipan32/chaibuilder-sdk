import { UseMutateFunction } from "@tanstack/react-query";
import type { ChaiAssetType } from "~/constants/ASSET_TYPES";

/** `file` covers legacy rows stored before per-category types existed. */
export type AssetType = ChaiAssetType;

export interface Asset {
  id: string;
  name: string;
  description?: Record<string, string>;
  type: AssetType;
  url: string;
  thumbnailUrl?: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // for videos
  format?: string;
  tags?: string[];
  folderId: string | null;
  createdAt: string;
  updatedAt?: string;
  usedOnCount?: number;
  /** `href` is where the reference is edited — the host fills it; older data has none. */
  usedOn?: Array<{ name: string; slug: string; href?: string }>;
}

export type AssetsManagerResponseProps = {
  query: string;
  selectedAssets: Asset[];
  assets: Asset[];
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  // Mutations
  uploadAsset: UseMutateFunction<
    any,
    Error,
    { file: File | Blob | Base64URLString; folderId: string | null; name: string },
    unknown
  >;
  updateAsset: UseMutateFunction<
    any,
    Error,
    { id: string; description?: Record<string, string>; file?: File | Blob | Base64URLString },
    unknown
  >;
  deleteAsset: UseMutateFunction<any, Error, string, unknown>;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  updateSearchQuery: (query: string) => void;
  clearSelectedAssets: () => void;
  updateSelectedAssets: (asset: Asset) => void;

  // Loading
  isLoadingAssets: boolean;
  isUploadingAsset: boolean;
  isUpdatingAsset: boolean;
  isDeletingAsset: boolean;
};
