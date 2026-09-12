import { ImageIcon, MoreVertical, Upload } from "lucide-react";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { mergeClasses } from "~/builder/core/main";
import { ChaiImage } from "~/builder/core/components/shared";
import { ChaiDraggableBlock } from "~/builder/core/components/sidepanels/panels/add-blocks/draggable-block";
import SearchInput from "~/builder/core/components/sidepanels/panels/add-blocks/search-input";
import MediaManagerModal from "~/builder/core/components/sidepanels/panels/images/media-manager-modal";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { BlurContainer } from "~/components/ui/loader";
import { compressImageIfNeeded } from "~/builder/pages/utils/image-compression";
import Tooltip from "~/builder/pages/utils/tooltip";
import { getTrashLabels } from "../constants/trash-config";
import { useDeleteAsset, useStreamUploadAsset, useUpdateAsset, useUploadAsset } from "../digital-asset-manager/mutations";
import { usePagesProp } from "../hooks/project/use-builder-prop";
import { useAssets, type Asset } from "../digital-asset-manager/use-assets";

const ImageEditor = React.lazy(() => import("../digital-asset-manager/image-editor"));

export const imagesPanelId = "images";

/**
 * SVGs still cross the JSON action endpoint, under nginx's *global*
 * `client_max_body_size 25m` — so their ceiling is this, not the streamed one.
 */
const BASE64_PATH_MAX_SIZE = 25 * 1024 * 1024;
/** Only used if the host never passes `maxFileSize`; the real value is env-driven. */
const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024;
const PAGE_SIZE = 30;

const isSvgFile = (file: File) => file.type === "image/svg+xml";

const ImagesButton = ({ isActive, show }: { isActive: boolean; show: () => void; panelId: string }) => {
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={show}
      aria-label={t("Images")}
      title={t("Images")}
      className={`h-8 w-8 ${isActive ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""}`}>
      <ImageIcon className="h-5 w-5" />
    </Button>
  );
};

const ImagesPanel = () => {
  const { t } = useTranslation();

  const [optimizeImages, setOptimizeImages] = useState<boolean>(
    () => localStorage.getItem("chai_optimize_images") !== "false",
  );
  useEffect(() => {
    localStorage.setItem("chai_optimize_images", optimizeImages.toString());
  }, [optimizeImages]);

  const [searchInputValue, setSearchInputValue] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  // Image names are an overlay on the thumbnails, shown while the user is
  // searching (input focused OR has a query — focus alone would drop the
  // names the moment they click a tile) and on per-tile hover otherwise,
  // so the grid stays clean while browsing.
  const showImageNames = isSearchFocused || searchInputValue.trim().length > 0;

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInputValue), 300);
    return () => clearTimeout(timer);
  }, [searchInputValue]);

  // ── Paginated list, accumulated across "Load more" clicks ─────────────
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<Asset[]>([]);

  // New search resets pagination
  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [searchQuery]);

  const { data, isLoading, isFetching } = useAssets({
    search: searchQuery.toLowerCase().trim(),
    page,
    limit: PAGE_SIZE,
  });

  // Merge each fetched page into the accumulated list (dedup by id)
  useEffect(() => {
    if (!data?.assets) return;
    setAccumulated((prev) => {
      const byId = new Map(prev.map((a) => [a.id, a]));
      for (const asset of data.assets as Asset[]) {
        if (asset.type === "image") byId.set(asset.id, asset);
      }
      return Array.from(byId.values());
    });
  }, [data]);

  // Only images are draggable onto the canvas
  const images = useMemo(() => accumulated, [accumulated]);

  const lastPageCount = data?.assets?.length ?? 0;
  const hasMore = lastPageCount === PAGE_SIZE;
  const isLoadingMore = isFetching && page > 1;
  // ── Mutations ─────────────────────────────────────────────────────────
  // From STORAGE_MAX_UPLOAD_MB, resolved server-side and passed in as a builder prop.
  const maxFileSize = usePagesProp("maxFileSize", DEFAULT_MAX_FILE_SIZE) as number;
  // Trash on: delete is a reversible move to archive, so the copy has to say that instead.
  const flags = usePagesProp("flags", {}) as Record<string, boolean>;
  const { mutateAsync: uploadAssets, isPending: isUploadingBase64 } = useUploadAsset();
  const {
    mutateAsync: streamUploadAssets,
    isPending: isStreaming,
    progress: uploadProgress,
    isFinalizing,
  } = useStreamUploadAsset();
  // Either path in flight must disable the drop zone and show the uploading state.
  const isUploading = isUploadingBase64 || isStreaming;
  const { mutateAsync: deleteAsset } = useDeleteAsset();
  const { mutateAsync: updateAsset } = useUpdateAsset();

  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);
  const [imageEditor, setImageEditor] = useState<{ id: string; url: string; name: string } | null>(null);

  const handleCopyUrl = useCallback(
    (asset: Asset) => {
      navigator.clipboard.writeText(asset.url);
      toast.success(t("Asset URL copied to clipboard"));
    },
    [t],
  );

  const handleConfirmDelete = useCallback(async () => {
    const asset = assetToDelete;
    if (!asset) return;
    setDeletingIds((prev) => [...prev, asset.id]);
    try {
      await deleteAsset(asset.id);
      // Removal is only triggered here, so reconcile the local list directly
      setAccumulated((prev) => prev.filter((a) => a.id !== asset.id));
      setAssetToDelete(null);
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== asset.id));
    }
  }, [assetToDelete, deleteAsset]);

  const handleImageEditorSave = useCallback(
    async (editedImageBase64: Base64URLString, isCopy: boolean) => {
      if (!imageEditor) return;
      try {
        if (isCopy) {
          await uploadAssets([
            { file: editedImageBase64, folderId: undefined, name: imageEditor.name, optimize: optimizeImages },
          ]);
        } else {
          await updateAsset({ id: imageEditor.id, file: editedImageBase64 });
        }
      } finally {
        setImageEditor(null);
      }
    },
    [imageEditor, uploadAssets, updateAsset, optimizeImages],
  );

  // ── Upload (drop files from OS onto the whole panel) ──────────────────
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const valid: File[] = [];
      let tooLarge = 0;
      let exceededLimit = maxFileSize;
      for (const file of acceptedFiles) {
        if (!file.type.startsWith("image/")) continue;
        // SVGs are bounded by the base64 endpoint; rasters only by the env-driven ceiling.
        const limit = isSvgFile(file) ? Math.min(maxFileSize, BASE64_PATH_MAX_SIZE) : maxFileSize;
        if (file.size > limit) {
          tooLarge++;
          exceededLimit = limit;
        } else {
          valid.push(file);
        }
      }
      if (tooLarge > 0) {
        // Derived from the same value the check used, so it cannot contradict the limit.
        const limitLabel = `${Math.floor(exceededLimit / (1024 * 1024))}MB`;
        toast.error(`${t("Some files exceed the maximum size limit of")} ${limitLabel}.`);
      }
      if (valid.length === 0) {
        if (tooLarge === 0) toast.error(t("Invalid file type. Please upload an image."));
        return;
      }

      try {
        // SVGs keep the base64 path (dimensions come from the markup); rasters stream.
        const svgFiles = valid.filter(isSvgFile);
        const rasterFiles = valid.filter((file) => !isSvgFile(file));

        await Promise.all([
          svgFiles.length
            ? Promise.all(
                svgFiles.map(async (file) => {
                  const processed = optimizeImages ? await compressImageIfNeeded(file) : file;
                  const dataUrl: string = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(processed);
                  });
                  return { file: dataUrl, folderId: undefined, name: file.name, optimize: optimizeImages };
                }),
              ).then((payload) => uploadAssets(payload))
            : Promise.resolve(),
          rasterFiles.length
            ? Promise.all(
                rasterFiles.map(async (file) => {
                  const processed: File | Blob = optimizeImages ? await compressImageIfNeeded(file) : file;
                  let width: number | undefined;
                  let height: number | undefined;
                  try {
                    const bitmap = await createImageBitmap(processed);
                    width = bitmap.width;
                    height = bitmap.height;
                    bitmap.close();
                  } catch {
                    // Optional metadata; a failure here must not fail the upload.
                  }
                  return { file: processed, name: file.name, folderId: undefined, width, height };
                }),
              ).then((payload) => streamUploadAssets(payload))
            : Promise.resolve(),
        ]);

        // Uploading a new page-1 asset should show up on top: reset and refetch page 1.
        setPage(1);
        setAccumulated([]);
      } catch {
        // Errors surfaced via the mutation's onError toast.
      }
    },
    [uploadAssets, streamUploadAssets, optimizeImages, maxFileSize, t],
  );

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
    noClick: true, // clicks must reach thumbnails/search, not open the file dialog
    noKeyboard: true,
    disabled: isUploading,
  });

  return (
    <div {...getRootProps({ className: "relative flex h-full flex-col gap-y-3 pb-3" })}>
      <input {...getInputProps()} />

      <div className="flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-1.5">
          <Switch checked={optimizeImages} onCheckedChange={setOptimizeImages} />
          <span className="text-xs text-foreground">{t("Optimize")}</span>
        </label>
        <Button variant="outline" size="sm" onClick={open} disabled={isUploading} loading={isUploading}>
          <Upload className="h-3.5 w-3.5" />
          {t("Upload")}
        </Button>
      </div>

      {/* Focus/blur bubble in React, so the wrapper sees the input's focus state.
          On blur, only clear when focus actually leaves the wrapper — moving
          from the input to SearchInput's internal clear button also fires blur. */}
      <div
        onFocus={() => setIsSearchFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsSearchFocused(false);
        }}>
        <SearchInput setValue={setSearchInputValue} value={searchInputValue} placeholder={t("Search images...")} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && page === 1 ? (
          <div className="grid grid-cols-2 gap-2 px-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse bg-accent" />
            ))}
          </div>
        ) : images.length === 0 && !hasMore ? (
          <div className="flex h-full flex-col items-center justify-center gap-y-2 px-4 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {searchQuery.length > 0
                ? t("No images found")
                : t("Drop images here or use the Upload button to add them.")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {images.map((asset) => (
                <div
                  key={asset.id}
                  className={mergeClasses(
                    "group relative overflow-hidden border border-transparent transition-colors hover:border-foreground/20",
                    deletingIds.includes(asset.id) ? "pointer-events-none opacity-50" : "",
                  )}>
                  <ChaiDraggableBlock
                    type="Image"
                    block={{ image: asset.url, alt: asset.name, name: asset.name }}
                    className="block">
                    <Tooltip content={asset.name}>
                      <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-muted">
                        <ChaiImage
                          src={asset.thumbnailUrl || asset.url}
                          alt={asset.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </Tooltip>
                  </ChaiDraggableBlock>

                  {/* Name overlay — bottom gradient caption; full name is in the hover Tooltip above */}
                  <div
                    aria-hidden="true"
                    className={mergeClasses(
                      "pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] leading-tight text-white transition-opacity",
                      showImageNames ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    )}>
                    {asset.name}
                  </div>

                  {/* More options — top right, matches the media manager card */}
                  <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 has-[[data-state=open]]:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon-sm"
                          aria-label={t("More actions")}
                          title={t("More actions")}
                          className="h-6 w-6 rounded-sm opacity-90 hover:opacity-100">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="bottom" className="w-36">
                        <DropdownMenuLabel>{t("ACTIONS")}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleCopyUrl(asset)}>{t("Copy URL")}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDetailAssetId(asset.id)}>
                          {t("View Details")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setImageEditor({ id: asset.id, url: asset.url, name: asset.name })}>
                          {t("Edit Image")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAssetToDelete(asset)}>
                          {flags?.trash ? t(getTrashLabels().sidebarButton) : t("Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoadingMore}
                  loading={isLoadingMore}>
                  {t("Load more")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drag-files-over overlay — covers the whole panel like the media manager */}
      {(isDragActive || isUploading) && (
        <div
          className={mergeClasses(
            "pointer-events-none absolute inset-0 z-50 flex w-full flex-col items-center justify-center gap-y-2 rounded-lg border-2 border-dashed bg-background/90 text-center",
            isDragActive ? "border-primary" : "border-border",
          )}>
          <Upload className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-foreground">
            {/* Bytes sent is not done: the route is still storing the file and writing the row. */}
            {isFinalizing ? t("Saving to storage...") : isUploading ? t("Uploading...") : t("Drop images to upload")}
            {/* Only streamed uploads report progress; base64 ones have none. */}
            {isUploading && !isFinalizing && typeof uploadProgress === "number"
              ? ` ${Math.round(uploadProgress * 100)}%`
              : ""}
          </p>
          {isUploading && typeof uploadProgress === "number" ? (
            <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                role="progressbar"
                aria-label={t("Uploading...")}
                aria-valuenow={Math.round(uploadProgress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={
                  isFinalizing ? t("Saving to storage...") : `${Math.round(uploadProgress * 100)}%`
                }
              />
            </div>
          ) : null}
        </div>
      )}

      {/* View details — reuse the full media manager, opened at this asset */}
      <MediaManagerModal
        mode="image"
        assetId={detailAssetId ?? undefined}
        open={Boolean(detailAssetId)}
        onOpenChange={(o) => !o && setDetailAssetId(null)}
        onSelect={() => setDetailAssetId(null)}
      />

      {/* Delete confirmation — mirrors the media manager's dialog */}
      {assetToDelete && (
        <Dialog
          open={Boolean(assetToDelete)}
          onOpenChange={(o) => {
            if (!o && deletingIds.length === 0) setAssetToDelete(null);
          }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{flags?.trash ? t(getTrashLabels().confirmMoveTitle) : t("Delete Asset(s)")}</DialogTitle>
              <DialogDescription>
                {flags?.trash
                  ? t('Are you sure you want to move "{{name}}" to archive?', { name: assetToDelete.name })
                  : t('Are you sure you want to delete "{{name}}"? This action cannot be undone.', {
                      name: assetToDelete.name,
                    })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setAssetToDelete(null)} disabled={deletingIds.length > 0}>
                {t("Cancel")}
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} loading={deletingIds.length > 0}>
                {flags?.trash ? t(getTrashLabels().moveToAction) : t("Delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit image — reuse the DAM image editor */}
      {imageEditor && (
        <Suspense fallback={<BlurContainer className="top-0" />}>
          <ImageEditor
            imageUrl={imageEditor.url}
            defaultSavedImageName={imageEditor.name}
            isEditing={true}
            onSave={handleImageEditorSave}
            onClose={() => setImageEditor(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export const imagesPanel = {
  button: ImagesButton,
  label: "Images",
  position: "top" as const,
  width: 280,
  icon: <ImageIcon className="h-5 w-5" />,
  panel: ImagesPanel,
};
