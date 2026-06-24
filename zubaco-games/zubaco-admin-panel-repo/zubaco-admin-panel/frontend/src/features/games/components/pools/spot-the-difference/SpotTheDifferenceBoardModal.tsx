'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogDrawerContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateBoard,
  useUpdateBoard,
  useBoardDetails,
} from '../../../hooks/pools/useDefaultPool';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import type { GameLevel } from '@/types/pool';
import type { SpotTheDifferenceBox, SpotTheDifferenceBoardDetails } from '@/types/games/spot-the-difference';
import { normalizeLevelName, sortLevelsByName } from '@/utils/level-order';
import { buildSpotTheDifferenceCreatePayloadFromJsonResult } from '@/types/games/spot-the-difference';

interface SpotTheDifferenceBoardModalProps {
  gameId: string;
  gameName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levels?: GameLevel[];
  levelsLoading?: boolean;
  editingBoardId?: string | null;
}

export function SpotTheDifferenceBoardModal({
  gameId,
  gameName,
  open,
  onOpenChange,
  levels,
  levelsLoading = false,
  editingBoardId = null,
}: SpotTheDifferenceBoardModalProps) {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [findImageUrl, setFindImageUrl] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [imageWidth, setImageWidth] = useState(500);
  const [imageHeight, setImageHeight] = useState(500);
  const [differences, setDifferences] = useState<Omit<SpotTheDifferenceBox, 'id' | 'createdAt'>[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const { toast } = useToast();
  
  // Memoize levels sorting so reference stays completely stable
  const sortedLevels = useMemo(() => sortLevelsByName(levels ?? []), [levels]);

  const { mutate: createBoard, isPending: isCreatePending } = useCreateBoard(gameId, gameName);
  const { mutate: updateBoard, isPending: isUpdatePending } = useUpdateBoard(gameId, gameName);
  const { mutateAsync: getBoardDetails } = useBoardDetails(gameName);

  const isPending = isCreatePending || isUpdatePending || loadingDetails;

  // React 18 state synchronization during render to prevent state updates triggering effect loop cascades
  const [prevEditingBoardId, setPrevEditingBoardId] = useState<string | null | undefined>(undefined);
  const [prevOpen, setPrevOpen] = useState(false);

  if (open !== prevOpen || editingBoardId !== prevEditingBoardId) {
    setPrevOpen(open);
    setPrevEditingBoardId(editingBoardId);

    if (open) {
      setFile(null);
      if (!editingBoardId) {
        setName('');
        setDifficulty(
          sortedLevels.find((l) => normalizeLevelName(l.name) === 'easy')?.id ||
            sortedLevels[0]?.id ||
            '',
        );
        setFindImageUrl('');
        setReferenceImageUrl('');
        setImageWidth(500);
        setImageHeight(500);
        setDifferences([]);
      } else {
        setName('');
        setDifficulty('');
        setFindImageUrl('');
        setReferenceImageUrl('');
        setImageWidth(500);
        setImageHeight(500);
        setDifferences([]);
      }
    }
  }

  // Load board details asynchronously if in editing mode (triggered only on open transition or edit board ID change)
  useEffect(() => {
    if (open && editingBoardId) {
      Promise.resolve().then(() => setLoadingDetails(true));
      getBoardDetails(editingBoardId)
        .then((details) => {
          if (details) {
            const typedDetails = details as SpotTheDifferenceBoardDetails;
            setName(typedDetails.name || '');
            setDifficulty(typedDetails.level?.id || '');
            setFindImageUrl(typedDetails.findImageUrl || '');
            setReferenceImageUrl(typedDetails.referenceImageUrl || '');
            setImageWidth(typedDetails.imageWidth || 500);
            setImageHeight(typedDetails.imageHeight || 500);
            setDifferences(typedDetails.differences || []);
          }
        })
        .catch(() => {
          toast({
            title: 'Failed to load details',
            description: 'Could not fetch existing board parameters.',
            variant: 'destructive',
          });
          onOpenChange(false);
        })
        .finally(() => setLoadingDetails(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingBoardId]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName('');
      setDifficulty('');
      setFindImageUrl('');
      setReferenceImageUrl('');
      setImageWidth(500);
      setImageHeight(500);
      setDifferences([]);
      setFile(null);
    }
    onOpenChange(newOpen);
  };

  const handleAddDifference = () => {
    setDifferences((prev) => [...prev, { x: 0, y: 0, width: 50, height: 50 }]);
  };

  const handleRemoveDifference = (index: number) => {
    setDifferences((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDifferenceChange = (
    index: number,
    field: keyof Omit<SpotTheDifferenceBox, 'id' | 'createdAt'>,
    value: number,
  ) => {
    setDifferences((prev) =>
      prev.map((diff, idx) => (idx === index ? { ...diff, [field]: value } : diff)),
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const defaultDifficulty =
      sortedLevels.find((l) => normalizeLevelName(l.name) === 'easy')?.id ||
      sortedLevels[0]?.id ||
      '';
    const activeDifficulty = difficulty || (editingBoardId ? '' : defaultDifficulty);

    if (!activeDifficulty) {
      toast({
        title: 'Validation Error',
        description: 'Please select a difficulty level.',
        variant: 'destructive',
      });
      return;
    }

    if (editingBoardId) {
      if (!findImageUrl.trim() || !referenceImageUrl.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Both Find and Reference image URLs are required.',
          variant: 'destructive',
        });
        return;
      }

      if (differences.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Set at least 1 difference region.',
          variant: 'destructive',
        });
        return;
      }

      const payload = {
        boardId: editingBoardId,
        levelId: activeDifficulty,
        name,
        findImageUrl,
        referenceImageUrl,
        imageWidth,
        imageHeight,
        differences,
      };
      updateBoard(payload, {
        onSuccess: () => handleOpenChange(false),
      });
    } else {
      if (!file) {
        toast({
          title: 'Validation Error',
          description: 'Please upload a JSON file.',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(String(event.target?.result ?? ''));
          const resolvedName = parsed.name || 'New Board';

          const validation = buildSpotTheDifferenceCreatePayloadFromJsonResult({
            levelId: activeDifficulty,
            name: resolvedName,
            json: parsed,
          });

          if (!validation.ok) {
            toast({
              title: 'Validation failed',
              description: validation.message || 'JSON mismatch.',
              variant: 'destructive',
            });
            return;
          }

          createBoard(validation.value, {
            onSuccess: () => handleOpenChange(false),
          });
        } catch {
          toast({
            title: 'Parse failed',
            description: 'Invalid JSON file format.',
            variant: 'destructive',
          });
        }
      };
      reader.readAsText(file);
    }
  };



  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogDrawerContent className="max-w-[520px]">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>{editingBoardId ? 'Edit Game Board' : 'Create Board'}</DialogTitle>
            <DialogDescription>
              {editingBoardId
                ? 'Configure image paths and specify target region coordinates.'
                : 'Select a level and upload a JSON file.'}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {editingBoardId ? (
                /* Edit Mode: Full manual controls (retained for backward compatibility / flexibility) */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="name">Board Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g. Castle Difference"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select value={difficulty} onValueChange={setDifficulty} disabled={levelsLoading}>
                        <SelectTrigger id="difficulty">
                          <SelectValue placeholder={levelsLoading ? 'Loading...' : 'Select Difficulty'} />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedLevels.map((lvl) => (
                            <SelectItem key={lvl.id} value={lvl.id}>
                              {lvl.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="refImage">Reference Image Path / URL</Label>
                    <Input
                      id="refImage"
                      placeholder="uploads/spot-the-difference/ref.jpg"
                      value={referenceImageUrl}
                      onChange={(e) => setReferenceImageUrl(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="findImage">Find Image Path / URL</Label>
                    <Input
                      id="findImage"
                      placeholder="uploads/spot-the-difference/find.jpg"
                      value={findImageUrl}
                      onChange={(e) => setFindImageUrl(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="width">Width (px)</Label>
                      <Input
                        id="width"
                        type="number"
                        min={10}
                        value={imageWidth}
                        onChange={(e) => setImageWidth(Math.max(10, Number(e.target.value)))}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="height">Height (px)</Label>
                      <Input
                        id="height"
                        type="number"
                        min={10}
                        value={imageHeight}
                        onChange={(e) => setImageHeight(Math.max(10, Number(e.target.value)))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h4 className="text-sm font-semibold text-foreground">Difference Bounding Boxes ({differences.length})</h4>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddDifference} className="gap-1.5 h-8">
                        <Plus className="h-3.5 w-3.5" />
                        Add Box
                      </Button>
                    </div>

                    {differences.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No bounding boxes defined yet. Click Add Box to start.</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {differences.map((diff, index) => (
                          <div key={index} className="flex items-center gap-3 border border-border p-3 rounded-lg bg-muted/5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/10 text-xs font-bold text-rose-500">
                              {index + 1}
                            </div>
                            <div className="grid grid-cols-4 gap-2 flex-1">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase">X position</Label>
                                <Input
                                  type="number"
                                  className="h-8 text-xs font-medium tabular-nums min-h-[32px]"
                                  value={diff.x}
                                  min={0}
                                  max={imageWidth}
                                  onChange={(e) => handleDifferenceChange(index, 'x', Number(e.target.value))}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase">Y position</Label>
                                <Input
                                  type="number"
                                  className="h-8 text-xs font-medium tabular-nums min-h-[32px]"
                                  value={diff.y}
                                  min={0}
                                  max={imageHeight}
                                  onChange={(e) => handleDifferenceChange(index, 'y', Number(e.target.value))}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase">Width</Label>
                                <Input
                                  type="number"
                                  className="h-8 text-xs font-medium tabular-nums min-h-[32px]"
                                  value={diff.width}
                                  min={1}
                                  max={imageWidth}
                                  onChange={(e) => handleDifferenceChange(index, 'width', Number(e.target.value))}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase">Height</Label>
                                <Input
                                  type="number"
                                  className="h-8 text-xs font-medium tabular-nums min-h-[32px]"
                                  value={diff.height}
                                  min={1}
                                  max={imageHeight}
                                  onChange={(e) => handleDifferenceChange(index, 'height', Number(e.target.value))}
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveDifference(index)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0 self-end mb-0.5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Create Mode: Level selector + drag/drop JSON file uploader */
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="difficulty">Level</Label>
                    <Select
                      value={
                        difficulty ||
                        sortedLevels.find(
                          (l) => normalizeLevelName(l.name) === 'easy',
                        )?.id ||
                        sortedLevels[0]?.id ||
                        ''
                      }
                      onValueChange={setDifficulty}
                      disabled={levelsLoading}
                    >
                      <SelectTrigger id="difficulty">
                        <SelectValue placeholder={levelsLoading ? 'Loading levels...' : 'Select level'} />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedLevels.map((lvl) => (
                          <SelectItem key={lvl.id} value={lvl.id}>
                            {lvl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="file">Board JSON File</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="spot-diff-board-file"
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="hidden"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-32 border-dashed flex flex-col items-center justify-center gap-3 bg-muted/5 hover:bg-muted/10 transition-all rounded-xl border-muted-foreground/20 hover:border-muted-foreground/40 cursor-pointer"
                        onClick={() => document.getElementById('spot-diff-board-file')?.click()}
                      >
                        {file ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="bg-primary/10 p-2.5 rounded-full animate-in zoom-in-50 duration-200">
                              <Upload className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-foreground truncate max-w-[250px]">
                              {file.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Click to replace JSON file
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2.5">
                            <Upload className="h-5 w-5 text-muted-foreground/80" />
                            <span className="text-sm text-muted-foreground">
                              Click to upload JSON file
                            </span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-border px-6 py-4 shrink-0">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                (!editingBoardId && (!file || levelsLoading || sortedLevels.length === 0))
              }
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBoardId ? 'Update Board' : 'Create Board'}
            </Button>
          </DialogFooter>
        </form>
      </DialogDrawerContent>
    </Dialog>
  );
}
