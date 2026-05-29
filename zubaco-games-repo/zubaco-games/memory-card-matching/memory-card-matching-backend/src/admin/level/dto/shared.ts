import { z } from "zod";

export const CardContentTypeSchema = z.enum([
  "symbol",
  "image",
  "color",
  "wordImage",
]);

const WordImageItemSchema = z.object({
  word: z.string().min(1),
  imageKey: z.string().min(1),
});

export const LevelContentConfigSchema = z.union([
  z.object({
    type: z.literal("symbol"),
    items: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal("image"),
    assetKeys: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal("color"),
    items: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal("wordImage"),
    items: z.array(WordImageItemSchema).min(1),
  }),
]);
