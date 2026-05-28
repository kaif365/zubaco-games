import { logger } from "@/lib/default-logger";
import { AxiosError } from "axios";
import { toast } from "sonner";

export interface FieldError {
  type: string;
  value?: string;
  msg: string;
  path: string;
  location?: string;
}

export interface ServerError {
  errors: FieldError[];
}

interface FieldMappings {
  topLevel?: Record<string, string>;
  childLevel?: Record<string, Record<string, string>>;
}

export interface ParsedServerError {
  message?: string;
  errors?: FieldError[];
}

export class ServiceError extends Error {
  status: number;
  details?: unknown;
  fieldErrors?: FieldError[];

  constructor(
    message: string,
    status = 500,
    details?: unknown,
    fieldErrors?: FieldError[],
  ) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

export function applyServerErrorsToRHForm(
  errors: FieldError[],
  handleServerMessage: (name: string, message: string) => void,
  keyMapper?: (serverKey: string) => string,
): void {
  errors.forEach((err) => {
    if (err.type === "field") {
      const fieldName = keyMapper ? keyMapper(err.path) : err.path;
      handleServerMessage(fieldName, err.msg);
    }
  });
}

export function handleServerError(
  error: unknown,
  suppressToastIfFieldErrors = false,
  fullSuppress = false,
): ParsedServerError {
  const axiosError = error as AxiosError;
  const responseData = axiosError?.response?.data as
    | {
        message?: string;
        errors?: unknown;
      }
    | undefined;

  let message: string | undefined;
  let errors: FieldError[] | undefined;
  let isObjectError = false;

  if (responseData) {
    const rawErrors = responseData.errors;
    const parsed = parseResponseErrors(responseData, rawErrors);
    message = parsed.message;
    errors = parsed.errors;
    isObjectError = parsed.isObjectError;
  }

  if (!message && error instanceof Error) {
    message = error.message;
  }

  const httpStatus = axiosError?.response?.status;
  const shouldSuppressAuthToast = httpStatus === 401;

  if (
    !fullSuppress &&
    !shouldSuppressAuthToast &&
    message &&
    shouldShowToast(isObjectError, errors, suppressToastIfFieldErrors) &&
    typeof window !== "undefined"
  ) {
    toast.error(message);
  }

  return { message, errors };
}

const parseResponseErrors = (
  responseData: { message?: string; errors?: unknown },
  rawErrors: unknown,
): { message?: string; errors?: FieldError[]; isObjectError: boolean } => {
  if (Array.isArray(rawErrors)) {
    return handleArrayErrors(responseData, rawErrors);
  }

  if (isNonNullObject(rawErrors)) {
    return handleObjectErrors(responseData, rawErrors);
  }

  return {
    message: responseData.message,
    errors: undefined,
    isObjectError: false,
  };
};

const handleArrayErrors = (
  responseData: { message?: string },
  rawErrors: unknown[],
): { message?: string; errors?: FieldError[]; isObjectError: boolean } => {
  const errors: FieldError[] = rawErrors
    .map((entry) => (isFieldError(entry) ? entry : undefined))
    .filter(
      (entry): entry is FieldError =>
        !!entry && !!entry.path && entry.path !== "undefined",
    );

  return {
    message: responseData.message,
    errors,
    isObjectError: false,
  };
};

const handleObjectErrors = (
  responseData: { message?: string },
  rawErrors: object,
): { message?: string; errors?: FieldError[]; isObjectError: boolean } => {
  const objectMessage =
    (rawErrors as { msg?: string; message?: string }).msg ??
    (rawErrors as { msg?: string; message?: string }).message;
  const message = objectMessage ?? responseData.message;
  const errors =
    Object.keys(rawErrors).length > 0 ? [rawErrors as FieldError] : undefined;

  return { message, errors, isObjectError: true };
};

const shouldShowToast = (
  isObjectError: boolean,
  errors: FieldError[] | undefined,
  suppressToastIfFieldErrors: boolean,
): boolean => {
  const hasErrorsArray = Array.isArray(errors);
  if (isObjectError) return true;
  if (!hasErrorsArray) return true;
  return errors.length === 0 || !suppressToastIfFieldErrors;
};

const isNonNullObject = (value: unknown): value is object => {
  return typeof value === "object" && value !== null;
};

const isFieldError = (value: unknown): value is FieldError => {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    "msg" in value &&
    "type" in value
  );
};

export const mapServerKeyToFormKey = (
  serverKey: string,
  mappings: FieldMappings,
  arrayFieldRegex: RegExp,
): string => {
  const { topLevel = {}, childLevel = {} } = mappings;

  if (topLevel[serverKey]) return topLevel[serverKey];

  const [parent, child] = serverKey.split(".");
  if (parent && child && childLevel[parent]?.[child]) {
    const mappedParent = topLevel[parent] ?? parent;
    const mappedChild = childLevel[parent][child];
    return `${mappedParent}.${mappedChild}`;
  }

  const arrayMatch = arrayFieldRegex.exec(serverKey);
  if (arrayMatch) {
    const [, arrayParent, index, arrayChild] = arrayMatch;
    const mappedParent = topLevel[arrayParent] ?? arrayParent;
    const mappedChild = childLevel[arrayParent]?.[arrayChild] ?? arrayChild;
    return `${mappedParent}.${index}.${mappedChild}`;
  }
  return serverKey;
};

export const handleServiceError = (error: unknown, context: string): never => {
  const status =
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { status?: number })?.status ??
    500;
  const parsed = handleServerError(error, true, true);
  const normalized = new ServiceError(
    parsed.message ?? "Unexpected service error",
    status,
    error,
    parsed.errors,
  );

  logger.error(`[Service:${context}]`, {
    status: normalized.status,
    message: normalized.message,
    details: normalized.details,
    fieldErrors: normalized.fieldErrors,
  });

  throw normalized;
};

export const withServiceErrorHandling = async <T>(
  context: string,
  action: () => Promise<T>,
): Promise<T> => {
  try {
    return await action();
  } catch (error) {
    return handleServiceError(error, context);
  }
};

export const withServiceErrorHandlingSync = <T>(
  context: string,
  action: () => T,
): T => {
  try {
    return action();
  } catch (error) {
    return handleServiceError(error, context);
  }
};
