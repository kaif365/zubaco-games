// Yup's type definitions do not satisfy strict @typescript-eslint/no-unsafe-* rules.
// These rules are intentionally disabled for this file only.
import { useFormik } from 'formik';
import { Check, Copy, Loader2, Play, Code, RefreshCw, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { moveTile } from '@/lib/sliding-puzzle/board';
import { cn } from '@/lib/utils';
import type { GameConfig } from '@/types/sliding-puzzle';

import { uploadFile } from '../api/fileApi';
import { generateShuffles, requireGameApiData } from '../api/gameApi';

import GameBoard from './GameBoard';

export default function GameEditor() {
  const [isUploading, setIsUploading] = useState(false);
  const [resultJson, setResultJson] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'json' | 'preview'>('preview');
  const [previewPieces, setPreviewPieces] = useState<number[]>([]);
  const [fetchedShuffles, setFetchedShuffles] = useState<number[][]>([]);
  const [currentShuffleIndex, setCurrentShuffleIndex] = useState(-1);
  const [isShuffling, setIsShuffling] = useState(false);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [showAddConfirm, setShowAddConfirm] = useState(false);

  const validationSchema = Yup.object({
    name: Yup.string()
      .max(40, 'Name must be at most 40 characters')
      .required('Puzzle name is required'),
    gridX: Yup.number().min(2, 'Min 2').max(10, 'Max 10').required('Required'),
    gridY: Yup.number().min(2, 'Min 2').max(10, 'Max 10').required('Required'),
    file: Yup.mixed<File>()
      .required('Please select an image file')
      .test('fileSize', 'File size must be less than 10MB', (value) => {
        return value.size <= 10 * 1024 * 1024;
      })
      .test('fileType', 'Supported formats: jpeg, jpg, png', (value) => {
        return ['image/jpeg', 'image/jpg', 'image/png'].includes(value.type);
      }),
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      gridX: 3,
      gridY: 3,
      file: null as File | null,
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsUploading(true);
      try {
        if (!values.file) return;
        const fileUrl = await uploadFile(values.file);
        const newConfig: GameConfig = {
          levelId: crypto.randomUUID(),
          name: values.name.trim(),
          gridSize: {
            x: values.gridX,
            y: values.gridY,
          },
          fileUrl,
          shuffles: [],
        };
        setConfig(newConfig);
        setResultJson(JSON.stringify(newConfig, null, 2));
      } catch (err) {
        console.error('Upload error:', err);
      } finally {
        setIsUploading(false);
      }
    },
  });

  const { values, errors, touched, setFieldValue, handleChange, handleBlur, handleSubmit } = formik;

  useEffect(() => {
    if (!values.file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(values.file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [values.file]);

  useEffect(() => {
    if (resultJson && previewPieces.length === 0) {
      const x = values.gridX || 0;
      const y = values.gridY || 0;
      const n = x * y;
      const solved = Array.from({ length: n }, (_, i) => (i === n - 1 ? -1 : i));
      setPreviewPieces(solved);
      setActiveTab('preview');
    }
  }, [resultJson, values.gridX, values.gridY, previewPieces.length]);

  const handleShuffle = async () => {
    if (isShuffling) return;

    let shuffles = fetchedShuffles;
    let nextIndex = currentShuffleIndex + 1;

    if (shuffles.length === 0 || nextIndex >= shuffles.length) {
      setIsShuffling(true);
      try {
        const response = await generateShuffles(values.gridX, values.gridY, 20);
        shuffles = requireGameApiData(response);
        setFetchedShuffles(shuffles);
        nextIndex = 0;
      } catch (error: unknown) {
        console.error('Failed to generate shuffles:', error);
        return;
      } finally {
        setIsShuffling(false);
      }
    }

    const nextShuffle = shuffles[nextIndex];
    setPreviewPieces([...nextShuffle]);
    setCurrentShuffleIndex(nextIndex);
  };

  const handleAddShuffle = () => {
    setShowAddConfirm(true);
  };

  const confirmAddShuffle = () => {
    if (!config) return;

    const newShuffles = [...config.shuffles, [...previewPieces]];
    const updatedConfig = { ...config, shuffles: newShuffles };
    setConfig(updatedConfig);
    setResultJson(JSON.stringify(updatedConfig, null, 2));
    setShowAddConfirm(false);
  };

  const handlePreviewTileClick = (slot: number) => {
    const x = values.gridX || 0;
    const result = moveTile(previewPieces, slot, x);
    if (result.moved) {
      setPreviewPieces(result.board);
    }
  };

  const copyToClipboard = async () => {
    if (resultJson) {
      try {
        await navigator.clipboard.writeText(resultJson);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className="space-y-4 py-2">
      {!resultJson ? (
        <form
          onSubmit={(e) => {
            handleSubmit(e);
          }}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="name"
                className="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Puzzle Name
              </label>
              <span className="text-[9px] font-medium text-slate-500 uppercase">
                {values.name.length} / 40
              </span>
            </div>
            <Input
              id="name"
              name="name"
              value={values.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Mountain Landscape"
              className={cn(
                'h-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-sky-500/50 text-sm',
                errors.name &&
                  touched.name &&
                  (values.name || formik.submitCount > 0) &&
                  'border-red-500/50 focus:border-red-500/50',
              )}
            />
            {errors.name && touched.name && (values.name || formik.submitCount > 0) && (
              <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="gridX"
                className="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Grid X (Cols)
              </label>
              <Input
                id="gridX"
                name="gridX"
                type="number"
                value={values.gridX}
                onChange={handleChange}
                onBlur={handleBlur}
                min={2}
                max={10}
                className={cn(
                  'h-9 bg-white/5 border-white/10 text-white focus:border-sky-500/50 text-sm',
                  errors.gridX &&
                    touched.gridX &&
                    (values.gridX > 0 || formik.submitCount > 0) &&
                    'border-red-500/50 focus:border-red-500/50',
                )}
              />
              {errors.gridX && touched.gridX && (values.gridX > 0 || formik.submitCount > 0) && (
                <p className="text-[10px] text-red-400 mt-1">{errors.gridX}</p>
              )}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="gridY"
                className="text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Grid Y (Rows)
              </label>
              <Input
                id="gridY"
                name="gridY"
                type="number"
                value={values.gridY}
                onChange={handleChange}
                onBlur={handleBlur}
                min={2}
                max={10}
                className={cn(
                  'h-9 bg-white/5 border-white/10 text-white focus:border-sky-500/50 text-sm',
                  errors.gridY &&
                    touched.gridY &&
                    (values.gridY > 0 || formik.submitCount > 0) &&
                    'border-red-500/50 focus:border-red-500/50',
                )}
              />
              {errors.gridY && touched.gridY && (values.gridY > 0 || formik.submitCount > 0) && (
                <p className="text-[10px] text-red-400 mt-1">{errors.gridY}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="file"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-400"
            >
              Puzzle Image
            </label>
            <div className="relative group">
              <Input
                id="file"
                name="file"
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                title=""
                onChange={(e) => {
                  void setFieldValue('file', e.target.files?.[0] || null);
                }}
                onBlur={handleBlur}
                className={cn(
                  'h-9 bg-white/5 border-white/10 text-transparent file:bg-sky-500/20 file:border-sky-500/30 file:text-sky-400 file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:px-3 file:py-0 file:h-full file:rounded-md file:mr-3 file:hover:bg-sky-500/30 file:cursor-pointer cursor-pointer transition-all hover:border-white/20 text-xs',
                  errors.file &&
                    touched.file &&
                    formik.submitCount > 0 &&
                    'border-red-500/50 focus:border-red-500/50',
                )}
              />
            </div>
            {errors.file && (formik.submitCount > 0 || (touched.file && values.file)) && (
              <p className="text-[10px] text-red-400 mt-1">{errors.file}</p>
            )}
            {previewUrl && (
              <div className="mt-2 relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/20 group">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-bold text-white uppercase tracking-widest">
                    Image Preview
                  </p>
                </div>
                <p className="absolute bottom-1 right-2 text-[8px] text-black font-mono">
                  {values.file?.name} (
                  {(values.file?.size || 0) / 1024 / 1024 > 1
                    ? `${((values.file?.size || 0) / 1024 / 1024).toFixed(1)}MB`
                    : `${((values.file?.size || 0) / 1024).toFixed(0)}KB`}
                  )
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isUploading}
            className="w-full h-10 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(2,132,199,0.15)] text-[10px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Uploading...
              </>
            ) : (
              'Generate JSON'
            )}
          </Button>
        </form>
      ) : (
        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Check className="h-3 w-3" /> Config Ready
            </h3>
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => {
                  setActiveTab('preview');
                }}
                className={cn(
                  'px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all',
                  activeTab === 'preview'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                <div className="flex items-center gap-1">
                  <Play className="h-2.5 w-2.5" /> Preview
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('json');
                }}
                className={cn(
                  'px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all',
                  activeTab === 'json'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                <div className="flex items-center gap-1">
                  <Code className="h-2.5 w-2.5" /> JSON
                </div>
              </button>
            </div>
          </div>

          <div className="relative">
            {activeTab === 'json' ? (
              <div className="relative group animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-full overflow-hidden">
                <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-sky-300 text-[10px] font-mono leading-relaxed overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all max-h-[240px] w-full">
                  {resultJson}
                </div>
                <Button
                  onClick={() => {
                    void copyToClipboard();
                  }}
                  variant="secondary"
                  size="sm"
                  className="absolute top-1.5 right-1.5 h-7 bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md text-[9px] px-2"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 h-3 w-3 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" /> Copy
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => {
                      setResultJson(null);
                      setConfig(null);
                      setFetchedShuffles([]);
                      setCurrentShuffleIndex(-1);
                      setPreviewPieces([]);
                    }}
                    variant="outline"
                    className="h-9 border-white/10 text-white hover:bg-white/5 text-[10px] uppercase font-bold tracking-tight"
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={() => {
                      const blob = new Blob([resultJson], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${values.name.replace(/\s+/g, '_').toLowerCase()}_config.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-bold tracking-tight"
                  >
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
                <div
                  className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5 p-2"
                  style={{ aspectRatio: `${String(values.gridX || 1)} / ${String(values.gridY || 1)}` }}
                >
                  <GameBoard
                    board={{
                      id: 'preview',
                      sessionBoardId: 'preview',
                      roundNumber: 1,
                      gridSize: { x: values.gridX || 0, y: values.gridY || 0 },
                      fullImageUrl: previewUrl || '',
                      displayTime: 0,
                      pieces: previewPieces,
                    }}
                    pieces={previewPieces}
                    onTileClick={handlePreviewTileClick}
                  />
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <Button
                      onClick={() => void handleShuffle()}
                      disabled={isShuffling}
                      variant="secondary"
                      size="sm"
                      className="h-8 bg-black/60 hover:bg-black/80 border border-white/20 text-white backdrop-blur-md text-[10px] font-bold uppercase tracking-wider px-3 shadow-2xl"
                    >
                      {isShuffling ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1.5 h-3 w-3" />
                      )}
                      Shuffle
                    </Button>
                    <Button
                      onClick={handleAddShuffle}
                      variant="secondary"
                      size="sm"
                      className="h-8 bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/30 text-white backdrop-blur-md text-[10px] font-bold uppercase tracking-wider px-3 shadow-2xl"
                    >
                      <Plus className="mr-1.5 h-3 w-3" /> Add Shuffle to JSON
                    </Button>
                  </div>
                </div>
                <p className="text-[9px] text-center text-slate-500 italic">
                  Interactive preview. Click tiles to move.
                </p>

                <div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/10 space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <RefreshCw className="h-3 w-3 text-sky-400" />
                      State Array
                    </span>
                  </div>
                  <div className="relative group">
                    <code className="block text-[10px] text-sky-300/90 font-mono break-all bg-black/40 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                      [{previewPieces.join(', ')}]
                    </code>
                    <div className="absolute inset-0 bg-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Confirmation Dialog for Adding Shuffle */}
      <Dialog open={showAddConfirm} onOpenChange={setShowAddConfirm}>
        <DialogContent className="bg-[#0f172a] border-white/10 text-white max-w-[320px] backdrop-blur-2xl p-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Plus className="h-6 w-6 text-emerald-400" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Add Shuffle?</DialogTitle>
            <DialogDescription className="text-center text-slate-400 text-xs leading-relaxed">
              Are you sure you want to add this current board state as a shuffle to your JSON
              configuration?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 mt-4 sm:justify-center">
            <Button
              onClick={() => {
                setShowAddConfirm(false);
              }}
              variant="outline"
              className="flex-1 h-9 border-white/10 text-white hover:bg-white/5 text-[10px] uppercase font-bold tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAddShuffle}
              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-bold tracking-wider shadow-lg shadow-emerald-900/20"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
