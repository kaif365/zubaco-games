"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogDescription,
  DialogDrawerContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateBoard,
  useGenerateMaze,
} from "../hooks/pools/useDefaultPool";
import { JsonViewModal } from "@/components/shared/JsonViewModal";
import { useToast } from "@/providers/ToastProvider";
import { getGamePoolAdapter } from "@/config/pool-registry";
import type { GameLevel, JsonValue } from "@/types/pool";
import {
  toMazeCreatePayload,
  type MazeTemplateGenerateResponse,
} from "@/types/games/maze";
import { normalizeLevelName, sortLevelsByName } from "@/utils/level-order";
import { slugifyGameName } from "@/utils/slugify";
import { FileJson, Loader2, Upload, WandSparkles } from "lucide-react";

interface CreatePoolModalProps {
  gameId: string;
  gameName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levels?: GameLevel[];
  levelsLoading?: boolean;
}

type MazeCreateMode = "upload" | "generate";

export function CreatePoolModal({
  gameId,
  gameName,
  open,
  onOpenChange,
  levels,
  levelsLoading = false,
}: CreatePoolModalProps) {
  const [difficulty, setDifficulty] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [mazeMode, setMazeMode] = useState<MazeCreateMode>("upload");
  const [mazeRows, setMazeRows] = useState<string>("11");
  const [mazeCols, setMazeCols] = useState<string>("11");
  const [mazeBoardName, setMazeBoardName] = useState("");
  const [generatedMaze, setGeneratedMaze] =
    useState<MazeTemplateGenerateResponse | null>(null);
  const [previewTitle, setPreviewTitle] = useState("View JSON");
  const [previewJson, setPreviewJson] = useState<unknown | null>(null);
  const { toast } = useToast();

  const sortedLevels = useMemo(() => sortLevelsByName(levels ?? []), [levels]);

  const { mutate: createBoard, isPending: isBoardPending } = useCreateBoard(
    gameId,
    gameName,
  );
  const { mutate: generateMaze, isPending: isGeneratingMaze } =
    useGenerateMaze(gameName);

  const isMazeGame = slugifyGameName(gameName) === "maze-navigation";

  const defaultLevelId =
    sortedLevels.find((level) => normalizeLevelName(level.name) === "easy")
      ?.id ||
    sortedLevels[0]?.id ||
    "";
  const selectedLevelId = difficulty || defaultLevelId;

  const selectedLevel = useMemo(() => {
    return sortedLevels.find((level) => level.id === selectedLevelId);
  }, [sortedLevels, selectedLevelId]);

  const levelRange = useMemo(() => {
    const name = selectedLevel ? normalizeLevelName(selectedLevel.name) : "";
    if (name.includes("easy")) {
      return { min: 11, max: 35 };
    }
    if (name.includes("medium")) {
      return { min: 37, max: 49 };
    }
    if (name.includes("hard")) {
      return { min: 51, max: 61 };
    }
    // fallback to the overall allowed range
    return { min: 11, max: 61 };
  }, [selectedLevel]);

  const mazeGridSizes = useMemo(() => {
    const { min, max } = levelRange;
    const allSizes = Array.from({ length: max - min + 1 }, (_, index) => index + min);
    // Keep only odd (uneven) sizes
    return allSizes.filter((size) => size % 2 === 1);
  }, [levelRange]);

  // Handle setting Rows/Columns to keep them matched and square
  const handleRowsChange = (value: string) => {
    setMazeRows(value);
    setMazeCols(value);
  };

  const handleColsChange = (value: string) => {
    setMazeCols(value);
    setMazeRows(value);
  };

  // Keep mazeRows and mazeCols within bounds and matching when level difficulty changes
  useEffect(() => {
    const { min, max } = levelRange;
    const currentRows = Number(mazeRows);
    if (isNaN(currentRows) || currentRows < min || currentRows > max) {
      setMazeRows(String(min));
      setMazeCols(String(min));
    } else {
      // Ensure rows and cols stay odd
      const oddValue = currentRows % 2 === 0 ? currentRows - 1 : currentRows;
      setMazeRows(String(oddValue));
      setMazeCols(String(oddValue));
    }
  }, [levelRange]);
  const isPending = isBoardPending || isGeneratingMaze;

  const resetState = () => {
    setDifficulty("");
    setFile(null);
    setMazeMode("upload");
    setMazeRows("10");
    setMazeCols("10");
    setMazeBoardName("");
    setGeneratedMaze(null);
    setPreviewJson(null);
    setPreviewTitle("View JSON");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSelectLevel = (value: string) => {
    setDifficulty(value);
    if (generatedMaze) {
      setGeneratedMaze(null);
    }
  };

  const handleCreateFromUpload = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedLevelId) {
      toast({
        title: "Levels not loaded",
        description: "Please wait for levels to load and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const rawText = String(loadEvent.target?.result ?? "");
      let parsed: JsonValue;
      try {
        parsed = JSON.parse(rawText) as JsonValue;
      } catch {
        toast({
          title: "Invalid JSON",
          description: "Could not parse the uploaded file as JSON.",
          variant: "destructive",
        });
        return;
      }

      const selectedLevelName =
        sortedLevels.find((level) => level.id === selectedLevelId)?.name ||
        "Board";
      const uniqueName = `${selectedLevelName} - ${new Date().toLocaleString()}`;
      const resolvedName = getJsonName(parsed) ?? uniqueName;
      const adapter = getGamePoolAdapter(gameName);
      const payloadResult = adapter.buildCreatePayloadFromJson({
        levelId: selectedLevelId,
        name: resolvedName,
        json: parsed,
      });

      if (!payloadResult.ok) {
        toast({
          title: "Invalid board JSON",
          description: payloadResult.message || adapter.invalidJsonMessage,
          variant: "destructive",
        });
        return;
      }

      createBoard(payloadResult.value, {
        onSuccess: () => handleOpenChange(false),
      });
    };
    reader.readAsText(file);
  };

  const handleGenerateMaze = () => {
    if (!selectedLevelId) {
      toast({
        title: "Level required",
        description: "Select a level before generating a maze.",
        variant: "destructive",
      });
      return;
    }

    generateMaze(
      {
        levelId: selectedLevelId,
        rows: Number(mazeRows),
        cols: Number(mazeCols),
      },
      {
        onSuccess: (response) => {
          if (!response) {
            toast({
              title: "Error",
              description: "Maze generation returned an empty response.",
              variant: "destructive",
            });
            return;
          }
          setGeneratedMaze(response);
          toast({
            title: "Maze generated",
            description: "Review the generated JSON, then create the board.",
            variant: "success",
          });
        },
      },
    );
  };

  const handleCreateGeneratedMaze = () => {
    if (!generatedMaze) return;
    createBoard(toMazeCreatePayload(generatedMaze), {
      onSuccess: () => handleOpenChange(false),
    });
  };

  const openGeneratedPreview = () => {
    if (!generatedMaze) return;
    setPreviewTitle(mazeBoardName.trim() || "Generated Maze JSON");
    setPreviewJson(toMazeCreatePayload(generatedMaze));
  };

  const levelSelect = (
    <div className="grid gap-2">
      <Label htmlFor="difficulty">Level</Label>
      <Select
        value={selectedLevelId}
        onValueChange={handleSelectLevel}
        disabled={levelsLoading}
      >
        <SelectTrigger id="difficulty">
          <SelectValue
            placeholder={levelsLoading ? "Loading levels..." : "Select level"}
          />
        </SelectTrigger>
        <SelectContent>
          {sortedLevels.map((level) => (
            <SelectItem key={level.id} value={level.id}>
              {level.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogDrawerContent className="max-w-[560px]">
          <form
            onSubmit={handleCreateFromUpload}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogHeader className="border-b border-border px-6 py-5">
              <DialogTitle>Create Board</DialogTitle>
              <DialogDescription>
                {isMazeGame
                  ? "Upload Maze JSON or generate a Maze puzzle before creating it."
                  : "Select a level and upload a JSON file."}
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {isMazeGame ? (
                <>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/20 p-1">
                    <Button
                      type="button"
                      variant={mazeMode === "upload" ? "default" : "ghost"}
                      onClick={() => {
                        setMazeMode("upload");
                        setGeneratedMaze(null);
                      }}
                    >
                      Upload JSON
                    </Button>
                    <Button
                      type="button"
                      variant={mazeMode === "generate" ? "default" : "ghost"}
                      onClick={() => setMazeMode("generate")}
                    >
                      Generate Maze
                    </Button>
                  </div>

                  {mazeMode === "upload" ? (
                    <>
                      {levelSelect}
                      <div className="grid gap-2">
                        <Label htmlFor="file">Board JSON File</Label>
                        <input
                          id="file"
                          type="file"
                          accept=".json"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-24 w-full border-dashed"
                          onClick={() =>
                            document.getElementById("file")?.click()
                          }
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="max-w-[240px] truncate text-xs text-muted-foreground">
                              {file ? file.name : "Click to upload JSON file"}
                            </span>
                          </div>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {levelSelect}

                      <div className="grid gap-2">
                        <Label htmlFor="maze-board-name">Board Name</Label>
                        <Input
                          id="maze-board-name"
                          value={mazeBoardName}
                          onChange={(event) => setMazeBoardName(event.target.value)}
                          placeholder="Maze board name"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="maze-rows">Rows</Label>
                          <Select value={mazeRows} onValueChange={handleRowsChange}>
                            <SelectTrigger id="maze-rows">
                              <SelectValue placeholder="Rows" />
                            </SelectTrigger>
                            <SelectContent viewportClassName="max-h-64">
                              {mazeGridSizes.map((size) => (
                                <SelectItem key={`rows-${size}`} value={String(size)}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="maze-cols">Columns</Label>
                          <Select value={mazeCols} onValueChange={handleColsChange}>
                            <SelectTrigger id="maze-cols">
                              <SelectValue placeholder="Columns" />
                            </SelectTrigger>
                            <SelectContent viewportClassName="max-h-64">
                              {mazeGridSizes.map((size) => (
                                <SelectItem key={`cols-${size}`} value={String(size)}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        className="gap-2"
                        disabled={!selectedLevelId || isGeneratingMaze}
                        onClick={handleGenerateMaze}
                      >
                        {isGeneratingMaze ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <WandSparkles className="h-4 w-4" />
                        )}
                        Generate Puzzle
                      </Button>

                      {generatedMaze ? (
                        <div className="rounded-xl border border-border bg-muted/20 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                {mazeBoardName.trim() || "Generated Maze"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {generatedMaze.rows} x {generatedMaze.cols} maze ready to save.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={openGeneratedPreview}
                            >
                              <FileJson className="h-4 w-4" />
                              View JSON
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              ) : (
                <>
                  {levelSelect}

                  <div className="grid gap-2">
                    <Label htmlFor="file">Board JSON File</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="file"
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="hidden"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="flex h-24 w-full flex-col gap-2 border-dashed"
                        onClick={() => document.getElementById("file")?.click()}
                      >
                        {file ? (
                          <>
                            <div className="rounded-full bg-primary/10 p-2">
                              <Upload className="h-4 w-4 text-primary" />
                            </div>
                            <span className="max-w-[200px] truncate text-xs">
                              {file.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Click to upload JSON file
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              {isMazeGame && mazeMode === "generate" ? (
                <Button
                  type="button"
                  disabled={!generatedMaze || levelsLoading || isPending}
                  onClick={handleCreateGeneratedMaze}
                >
                  {isBoardPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Board
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={
                    !file ||
                    levelsLoading ||
                    sortedLevels.length === 0 ||
                    isPending
                  }
                >
                  {isBoardPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Board
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogDrawerContent>
      </Dialog>

      <JsonViewModal
        isOpen={!!previewJson}
        onClose={() => setPreviewJson(null)}
        title={previewTitle}
        data={previewJson}
      />
    </>
  );
}

function isJsonObject(
  value: JsonValue | undefined,
): value is Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getJsonName(json: JsonValue): string | null {
  if (!isJsonObject(json)) return null;
  const name = json.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
