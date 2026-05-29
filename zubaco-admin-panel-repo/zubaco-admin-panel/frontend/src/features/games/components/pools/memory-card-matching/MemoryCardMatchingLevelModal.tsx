"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FileUploader } from "react-drag-drop-files";
import { Image as ImageIcon, Loader2, Pencil, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogDrawerContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/providers/ToastProvider";
import {
  useCreateMemoryCardMatchingLevel,
  useUpdateMemoryCardMatchingLevel,
  useUploadMemoryCardMatchingFiles,
} from "@/features/games/hooks/pools/useMemoryCardMatchingLevels";
import { useDifficulties } from "@/features/games/hooks/pools/useDefaultPool";
import {
  type MemoryCardMatchingLevel,
  isImageContentConfig,
  isSymbolContentConfig,
} from "@/types/games/memory-card-matching";
import { resolveMemoryCardAssetUrl } from "@/utils/memory-card-asset-url";

interface MemoryCardMatchingLevelModalProps {
  gameId: string;
  gameName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, modal edits this level; otherwise creates a new image-based level. */
  editingLevel?: MemoryCardMatchingLevel | null;
}

const IMAGE_TYPES = ["JPG", "JPEG", "PNG", "WEBP"];
const DEFAULT_IMAGE_FILES: Array<File | null> = [null, null];

function toInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function getPairCount(gridRows: number, gridColumns: number): number {
  const cells = gridRows * gridColumns;
  return cells % 2 === 0 ? cells / 2 : 0;
}

function FilePreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return (
    <div
      className="h-16 w-16 shrink-0 rounded-lg border border-border bg-cover bg-center"
      style={{ backgroundImage: `url(${url})` }}
      role="img"
      aria-label={file.name}
    />
  );
}

function RemoteAssetPreview({ assetKey }: { assetKey: string }) {
  const src = useMemo(() => resolveMemoryCardAssetUrl(assetKey), [assetKey]);
  const [broken, setBroken] = useState(false);

  // Reset broken state when assetKey changes during rendering to avoid useEffect warning
  const [prevKey, setPrevKey] = useState(assetKey);
  if (assetKey !== prevKey) {
    setPrevKey(assetKey);
    setBroken(false);
  }

  if (!src) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-[10px] text-muted-foreground">
        —
      </div>
    );
  }

  if (broken) {
    return (
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-1 text-center text-[10px] text-destructive">
        Preview failed
      </div>
    );
  }

  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/20">
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        className="object-cover"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

function ImageUploadSlot({
  index,
  file,
  existingKey,
  disabled,
  onChange,
  onClear,
  onTypeError,
}: {
  index: number;
  file: File | null;
  existingKey?: string | null;
  disabled: boolean;
  onChange: (file: File) => void;
  onClear: () => void;
  onTypeError: (message: string) => void;
}) {
  const hasRetained = Boolean(existingKey?.trim());
  const showClear = Boolean(file) || (hasRetained && !file);

  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Match Image {index + 1}
        </p>
        {showClear ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            disabled={disabled}
            aria-label={`Remove image ${index + 1}`}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <FileUploader
        name={`mcm-level-image-${index}`}
        types={IMAGE_TYPES}
        disabled={disabled}
        handleChange={(selected) => {
          if (selected instanceof File) onChange(selected);
        }}
        onTypeError={onTypeError}
        hoverTitle="Drop image"
      >
        <div className="flex min-h-28 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 p-3 transition hover:bg-muted/20">
          {file ? (
            <>
              <FilePreview file={file} />
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Click or drop to replace
                </p>
              </div>
            </>
          ) : hasRetained ? (
            <>
              <RemoteAssetPreview assetKey={existingKey!.trim()} />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">Current image</p>
                <p className="text-xs text-muted-foreground">
                  Click or drop to replace, or remove to clear
                </p>
                <p className="truncate font-mono text-[10px] text-muted-foreground/90">
                  {existingKey}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Upload image
                </p>
                <p className="text-xs text-muted-foreground">
                  Drop or select one matching asset
                </p>
              </div>
            </>
          )}
        </div>
      </FileUploader>
    </div>
  );
}

export function MemoryCardMatchingLevelModal({
  gameId,
  gameName,
  open,
  onOpenChange,
  editingLevel = null,
}: MemoryCardMatchingLevelModalProps) {
  const isEdit = Boolean(editingLevel);

  const [name, setName] = useState("");
  const [gridRows, setGridRows] = useState(2);
  const [gridColumns, setGridColumns] = useState(2);
  const [previewDurationSeconds, setPreviewDurationSeconds] = useState(2);
  const [mismatchDisplayDurationSeconds, setMismatchDisplayDurationSeconds] =
    useState(1);
  const [difficultyId, setDifficultyId] = useState("");
  const [imageFiles, setImageFiles] =
    useState<Array<File | null>>(DEFAULT_IMAGE_FILES);
  const [retainedAssetKeys, setRetainedAssetKeys] = useState<string[]>([]);
  const [symbolItems, setSymbolItems] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const createLevel = useCreateMemoryCardMatchingLevel(gameId, gameName);
  const updateLevel = useUpdateMemoryCardMatchingLevel(gameId, gameName);
  const uploadFiles = useUploadMemoryCardMatchingFiles(gameName);
  const { data: difficultiesData, isLoading: difficultiesLoading } = useDifficulties(gameName, { limit: 100 });
  const difficulties = useMemo(() => difficultiesData?.data ?? [], [difficultiesData]);

  const totalCells = gridRows * gridColumns;
  const isEvenGrid = totalCells > 0 && totalCells % 2 === 0;
  const pairCount = useMemo(
    () => getPairCount(gridRows, gridColumns),
    [gridRows, gridColumns],
  );

  const isSymbolLevel = isEdit && editingLevel && editingLevel.cardContentType === "symbol";

  const resizeImageSlots = (rows: number, columns: number) => {
    const nextPairCount = getPairCount(rows, columns);
    if (nextPairCount < 1) return;
    setImageFiles((prev) =>
      Array.from({ length: nextPairCount }, (_, index) => prev[index] ?? null),
    );
    setRetainedAssetKeys((prev) =>
      Array.from({ length: nextPairCount }, (_, index) => prev[index] ?? ""),
    );
  };

  const resizeSymbolItems = (rows: number, columns: number) => {
    const nextPairCount = getPairCount(rows, columns);
    if (nextPairCount < 1) return;
    setSymbolItems((prev) =>
      Array.from({ length: nextPairCount }, (_, index) => prev[index] ?? ""),
    );
  };

  const reset = useCallback(() => {
    setName("");
    setGridRows(2);
    setGridColumns(2);
    setPreviewDurationSeconds(2);
    setMismatchDisplayDurationSeconds(1);
    setImageFiles(DEFAULT_IMAGE_FILES);
    setRetainedAssetKeys([]);
    setSymbolItems([]);
    const easy = difficulties.find(d => d.name.toLowerCase() === "easy");
    setDifficultyId(easy?.id || "");
    setIsSubmitting(false);
  }, [difficulties]);

  // Synchronize form state with props during rendering to avoid useEffect warnings.
  // This is a documented React pattern for adjusting state when props change.
  const [prevEditingLevelId, setPrevEditingLevelId] = useState<string | null | undefined>(undefined);
  const [prevOpen, setPrevOpen] = useState(false);

  if (open !== prevOpen || (editingLevel?.id !== prevEditingLevelId)) {
    setPrevOpen(open);
    setPrevEditingLevelId(editingLevel?.id);

    if (open) {
      if (!editingLevel) {
        // Reset to defaults for new level
        setName("");
        setGridRows(2);
        setGridColumns(2);
        setPreviewDurationSeconds(2);
        setMismatchDisplayDurationSeconds(1);
        setImageFiles(DEFAULT_IMAGE_FILES);
        setRetainedAssetKeys([]);
        setSymbolItems([]);
        const easy = difficulties.find(d => d.name.toLowerCase() === "easy");
        setDifficultyId(easy?.id || "");
        setIsSubmitting(false);
      } else {
        // Populate from editing level
        const pc = getPairCount(editingLevel.gridRows, editingLevel.gridColumns);
        setName(editingLevel.name);
        setGridRows(editingLevel.gridRows);
        setGridColumns(editingLevel.gridColumns);
        setPreviewDurationSeconds(editingLevel.previewDurationSeconds);
        setMismatchDisplayDurationSeconds(editingLevel.mismatchDisplayDurationSeconds);
        setDifficultyId(editingLevel.difficultyId || "");

        if (isSymbolContentConfig(editingLevel.contentConfig)) {
          const items = editingLevel.contentConfig.items ?? [];
          setSymbolItems(
            Array.from({ length: Math.max(pc, 1) }, (_, i) => items[i] ?? ""),
          );
          setRetainedAssetKeys([]);
          setImageFiles(Array.from({ length: Math.max(pc, 1) }, () => null));
        } else if (isImageContentConfig(editingLevel.contentConfig)) {
          const keys = editingLevel.contentConfig.assetKeys ?? [];
          setRetainedAssetKeys(
            Array.from({ length: Math.max(pc, 1) }, (_, i) => keys[i] ?? ""),
          );
          setImageFiles(Array.from({ length: Math.max(pc, 1) }, () => null));
          setSymbolItems([]);
        } else {
          setRetainedAssetKeys(
            Array.from({ length: Math.max(pc, 1) }, () => ""),
          );
          setImageFiles(Array.from({ length: Math.max(pc, 1) }, () => null));
          setSymbolItems([]);
        }
      }
    }
  }

  // Handle case where difficulties load after the modal is opened for a new level
  const [prevDifficultiesLength, setPrevDifficultiesLength] = useState(0);
  if (!editingLevel && open && !difficultyId && difficulties.length > 0 && difficulties.length !== prevDifficultiesLength) {
    setPrevDifficultiesLength(difficulties.length);
    const easy = difficulties.find(d => d.name.toLowerCase() === "easy");
    if (easy) {
      setDifficultyId(easy.id);
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const validationMessage = (() => {
    if (!name.trim()) return "Enter a level name.";
    if (!difficultyId) return "Select a difficulty.";
    if (!isEvenGrid) return "Grid rows x columns must be an even number.";
    if (pairCount < 1) return "Choose a valid grid size.";
    if (previewDurationSeconds < 1) return "Preview duration must be positive.";
    if (mismatchDisplayDurationSeconds < 1) {
      return "Mismatch display duration must be positive.";
    }

    if (!isEdit) {
      if (imageFiles.some((file) => !file)) {
        return `Upload ${pairCount} image${pairCount === 1 ? "" : "s"} for this grid.`;
      }
      return null;
    }

    if (isSymbolLevel) {
      if (symbolItems.length !== pairCount) {
        return "Symbol count must match the number of pairs for this grid.";
      }
      if (symbolItems.some((s) => !String(s).trim())) {
        return "Fill every symbol slot (one label per pair).";
      }
      return null;
    }

    for (let i = 0; i < pairCount; i++) {
      const hasFile = imageFiles[i] instanceof File;
      const hasKey = Boolean(retainedAssetKeys[i]?.trim());
      if (!hasFile && !hasKey) {
        return `Provide image ${i + 1} (keep existing or upload a new file).`;
      }
    }
    return null;
  })();

  const buildImageAssetKeys = async (): Promise<string[]> => {
    const slots: string[] = Array.from({ length: pairCount }, () => "");
    const uploadList: { index: number; file: File }[] = [];

    for (let i = 0; i < pairCount; i++) {
      const f = imageFiles[i];
      if (f instanceof File) uploadList.push({ index: i, file: f });
      else if (retainedAssetKeys[i]?.trim()) slots[i] = retainedAssetKeys[i].trim();
    }

    if (uploadList.length > 0) {
      const uploaded = await uploadFiles.mutateAsync(
        uploadList.map((u) => u.file),
      );
      uploadList.forEach((u, j) => {
        slots[u.index] = uploaded[j] ?? "";
      });
    }

    if (slots.some((k) => !k)) {
      throw new Error("Missing image asset keys after upload.");
    }
    return slots;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validationMessage) {
      toast({
        title: "Fix level details",
        description: validationMessage,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (!isEdit) {
        const files = imageFiles.filter((file): file is File => file instanceof File);
        const assetKeys = await uploadFiles.mutateAsync(files);
        await createLevel.mutateAsync({
          name: name.trim(),
          gridRows,
          gridColumns,
          cardContentType: "image",
          previewDurationSeconds,
          mismatchDisplayDurationSeconds,
          difficultyId,
          contentConfig: {
            type: "image",
            assetKeys,
          },
        });
        handleOpenChange(false);
        return;
      }

      if (!editingLevel) return;

      if (isSymbolLevel) {
        await updateLevel.mutateAsync({
          levelId: editingLevel.id,
          name: name.trim(),
          gridRows,
          gridColumns,
          cardContentType: "symbol",
          previewDurationSeconds,
          mismatchDisplayDurationSeconds,
          difficultyId,
          contentConfig: {
            type: "symbol",
            items: symbolItems.map((s) => s.trim()),
          },
        });
      } else {
        const assetKeys = await buildImageAssetKeys();
        await updateLevel.mutateAsync({
          levelId: editingLevel.id,
          name: name.trim(),
          gridRows,
          gridColumns,
          cardContentType: "image",
          previewDurationSeconds,
          mismatchDisplayDurationSeconds,
          difficultyId,
          contentConfig: {
            type: "image",
            assetKeys,
          },
        });
      }
      handleOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pending =
    isSubmitting ||
    createLevel.isPending ||
    updateLevel.isPending ||
    uploadFiles.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogDrawerContent className="max-w-[760px]">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>
              {isEdit ? "Edit Memory Card Level" : "Add Memory Card Level"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? isSymbolLevel
                  ? "Update name, grid, timing, and symbol labels for each pair."
                  : "Update name, grid, timing, and image assets. Upload a file to replace an existing asset."
                : "Configure the grid and upload one image for each matching pair."}
            </DialogDescription>
          </DialogHeader>

          <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="mcm-level-name">Level Name</Label>
                <Input
                  id="mcm-level-name"
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                  placeholder="Animals 4x4"
                  disabled={pending}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="mcm-level-difficulty">Difficulty</Label>
                <Select
                  value={difficultyId}
                  onValueChange={setDifficultyId}
                  disabled={pending || difficultiesLoading}
                >
                  <SelectTrigger id="mcm-level-difficulty">
                    <SelectValue
                      placeholder={
                        difficultiesLoading
                          ? "Loading difficulties..."
                          : "Select difficulty"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mcm-grid-rows">Grid Rows</Label>
                <Input
                  id="mcm-grid-rows"
                  type="number"
                  min={1}
                  value={gridRows}
                  onChange={(event) => {
                    const nextRows = toInt(event.currentTarget.value, gridRows);
                    setGridRows(nextRows);
                    if (isSymbolLevel) resizeSymbolItems(nextRows, gridColumns);
                    else resizeImageSlots(nextRows, gridColumns);
                  }}
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mcm-grid-columns">Grid Columns</Label>
                <Input
                  id="mcm-grid-columns"
                  type="number"
                  min={1}
                  value={gridColumns}
                  onChange={(event) => {
                    const nextColumns = toInt(
                      event.currentTarget.value,
                      gridColumns,
                    );
                    setGridColumns(nextColumns);
                    if (isSymbolLevel) resizeSymbolItems(gridRows, nextColumns);
                    else resizeImageSlots(gridRows, nextColumns);
                  }}
                  disabled={pending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mcm-preview-duration">
                  Preview Duration Seconds
                </Label>
                <Input
                  id="mcm-preview-duration"
                  type="number"
                  min={1}
                  value={previewDurationSeconds}
                  onChange={(event) =>
                    setPreviewDurationSeconds(
                      toInt(
                        event.currentTarget.value,
                        previewDurationSeconds,
                      ),
                    )
                  }
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mcm-mismatch-duration">
                  Mismatch Display Duration Seconds
                </Label>
                <Input
                  id="mcm-mismatch-duration"
                  type="number"
                  min={1}
                  value={mismatchDisplayDurationSeconds}
                  onChange={(event) =>
                    setMismatchDisplayDurationSeconds(
                      toInt(
                        event.currentTarget.value,
                        mismatchDisplayDurationSeconds,
                      ),
                    )
                  }
                  disabled={pending}
                />
              </div>
            </div>

            {isSymbolLevel ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-muted/10 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Symbol pairs</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {pairCount} label{pairCount === 1 ? "" : "s"} (one per unique pair).
                  </p>
                </div>
                {isEvenGrid ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {symbolItems.slice(0, pairCount).map((item, index) => (
                      <div key={index} className="space-y-2">
                        <Label htmlFor={`mcm-symbol-${index}`}>Symbol {index + 1}</Label>
                        <Input
                          id={`mcm-symbol-${index}`}
                          value={item}
                          onChange={(e) =>
                            setSymbolItems((prev) => {
                              const next = [...prev];
                              next[index] = e.target.value;
                              return next;
                            })
                          }
                          placeholder="e.g. star"
                          disabled={pending}
                          className="font-mono"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                    Choose an even grid size for symbol pairs.
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-muted/10 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {isEdit ? "Image pair assets" : "Image Pair Assets"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {isEvenGrid
                          ? `${gridRows} x ${gridColumns} grid needs ${pairCount} unique image${pairCount === 1 ? "" : "s"}.`
                          : "Grid rows x columns must be even."}
                      </p>
                    </div>
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      image
                    </div>
                  </div>
                </div>

                {isEvenGrid ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {imageFiles.slice(0, pairCount).map((file, index) => (
                      <ImageUploadSlot
                        key={index}
                        index={index}
                        file={file}
                        existingKey={isEdit ? retainedAssetKeys[index] : null}
                        disabled={pending}
                        onChange={(nextFile) =>
                          setImageFiles((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? nextFile : item,
                            ),
                          )
                        }
                        onClear={() => {
                          setImageFiles((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? null : item,
                            ),
                          );
                          setRetainedAssetKeys((prev) =>
                            prev.map((key, itemIndex) =>
                              itemIndex === index ? "" : key,
                            ),
                          );
                        }}
                        onTypeError={(message) =>
                          toast({
                            title: "Invalid image",
                            description: message,
                            variant: "destructive",
                          })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                    Choose an even grid size to upload image pairs.
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || Boolean(validationMessage)}>
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isEdit ? (
                <Pencil className="mr-2 h-4 w-4" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isEdit ? "Save changes" : "Create Level"}
            </Button>
          </DialogFooter>
        </form>
      </DialogDrawerContent>
    </Dialog>
  );
}
