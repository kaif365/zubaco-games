import type { BaseGameBoard, JsonValue } from "@/types/pool";
import {
  fail,
  ok,
  type ValidationIssue,
  type ValidationResult,
} from "@/lib/validation";

export interface SpotTheDifferenceBox {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt?: string;
}

export interface SpotTheDifferenceBoard extends BaseGameBoard {
  findImageUrl: string;
  referenceImageUrl: string;
  imageWidth: number;
  imageHeight: number;
  differenceCount: number;
}

export interface SpotTheDifferenceBoardDetails extends SpotTheDifferenceBoard {
  differences: SpotTheDifferenceBox[];
}

export interface CreateSpotTheDifferenceBoardRequest {
  levelId: string;
  name: string;
  findImageUrl: string;
  referenceImageUrl: string;
  imageWidth: number;
  imageHeight: number;
  differences: Omit<SpotTheDifferenceBox, 'id' | 'createdAt'>[];
}

export interface UpdateSpotTheDifferenceBoardRequest {
  boardId: string;
  name: string;
  findImageUrl: string;
  referenceImageUrl: string;
  imageWidth: number;
  imageHeight: number;
  differences: Omit<SpotTheDifferenceBox, 'id' | 'createdAt'>[];
}

function isJsonObject(
  value: JsonValue | undefined,
): value is Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateSpotTheDifferenceJson(
  json: JsonValue,
): ValidationResult<{
  findImageUrl: string;
  referenceImageUrl: string;
  imageWidth: number;
  imageHeight: number;
  differences: Omit<SpotTheDifferenceBox, 'id' | 'createdAt'>[];
}> {
  if (!isJsonObject(json)) {
    return fail("Board JSON must be an object (not an array).");
  }

  const issues: ValidationIssue[] = [];

  const findImageUrl = json.findImageUrl;
  if (typeof findImageUrl !== "string" || !findImageUrl.trim()) {
    issues.push({ path: "findImageUrl", message: "Expected a non-empty string." });
  }

  const referenceImageUrl = json.referenceImageUrl;
  if (typeof referenceImageUrl !== "string" || !referenceImageUrl.trim()) {
    issues.push({ path: "referenceImageUrl", message: "Expected a non-empty string." });
  }

  const imageWidth = json.imageWidth;
  if (!isFiniteNumber(imageWidth) || imageWidth <= 0) {
    issues.push({ path: "imageWidth", message: "Expected a positive number." });
  }

  const imageHeight = json.imageHeight;
  if (!isFiniteNumber(imageHeight) || imageHeight <= 0) {
    issues.push({ path: "imageHeight", message: "Expected a positive number." });
  }

  const differences = json.differences;
  if (!Array.isArray(differences)) {
    issues.push({ path: "differences", message: "Expected an array of differences." });
  }

  const validatedDifferences: Omit<SpotTheDifferenceBox, 'id' | 'createdAt'>[] = [];
  if (Array.isArray(differences)) {
    differences.forEach((diff, idx) => {
      if (!isJsonObject(diff)) {
        issues.push({ path: `differences[${idx}]`, message: "Expected an object." });
        return;
      }
      if (
        !isFiniteNumber(diff.x) ||
        !isFiniteNumber(diff.y) ||
        !isFiniteNumber(diff.width) ||
        !isFiniteNumber(diff.height)
      ) {
        issues.push({
          path: `differences[${idx}]`,
          message: "Expected numeric x, y, width, and height values.",
        });
        return;
      }
      validatedDifferences.push({
        x: diff.x,
        y: diff.y,
        width: diff.width,
        height: diff.height,
      });
    });
  }

  if (issues.length) {
    return fail("Invalid Spot the Difference board JSON.", issues);
  }

  return ok({
    findImageUrl: findImageUrl as string,
    referenceImageUrl: referenceImageUrl as string,
    imageWidth: imageWidth as number,
    imageHeight: imageHeight as number,
    differences: validatedDifferences,
  });
}

export function buildSpotTheDifferenceCreatePayloadFromJsonResult(input: {
  levelId: string;
  name: string;
  json: JsonValue;
}): ValidationResult<CreateSpotTheDifferenceBoardRequest> {
  const validated = validateSpotTheDifferenceJson(input.json);
  if (!validated.ok) return validated;

  return ok({
    levelId: input.levelId,
    name: input.name,
    findImageUrl: validated.value.findImageUrl,
    referenceImageUrl: validated.value.referenceImageUrl,
    imageWidth: validated.value.imageWidth,
    imageHeight: validated.value.imageHeight,
    differences: validated.value.differences,
  });
}

export function formatSpotTheDifferenceBoardDetails(data: SpotTheDifferenceBoardDetails) {
  if (!data) return null;
  return {
    levelId: data.level?.id || "",
    name: data.name,
    findImageUrl: data.findImageUrl,
    referenceImageUrl: data.referenceImageUrl,
    imageWidth: data.imageWidth,
    imageHeight: data.imageHeight,
    differences: (data.differences || []).map((diff) => ({
      x: diff.x,
      y: diff.y,
      width: diff.width,
      height: diff.height,
    })),
  };
}
