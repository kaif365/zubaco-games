export interface SocketExceptionEnvelope {
  success: false;
  statusCode?: number;
  message: string;
  data: unknown;
}

export const parseSocketExceptionPayload = (
  raw: unknown,
): SocketExceptionEnvelope | null => {
  let envelope: unknown = raw;

  if (
    Array.isArray(raw) &&
    raw.length >= 2 &&
    typeof raw[1] === "object" &&
    raw[1] !== null &&
    (raw[0] === "exception" || "success" in raw[1])
  ) {
    envelope = raw[1];
  }

  if (!envelope || typeof envelope !== "object") return null;

  const record = envelope as Record<string, unknown>;
  if (record.success !== false) return null;

  const message = record.message;
  if (typeof message !== "string") return null;

  const trimmedMessage = message.trim();
  if (!trimmedMessage) return null;

  return {
    success: false,
    statusCode:
      typeof record.statusCode === "number" ? record.statusCode : undefined,
    message: trimmedMessage,
    data: record.data ?? null,
  };
};

export const getSocketExceptionMessage = (raw: unknown): string | undefined =>
  parseSocketExceptionPayload(raw)?.message;

export const parseSocketIoErrorMessage = (err: unknown): string | undefined => {
  const exceptionMessage = getSocketExceptionMessage(err);
  if (exceptionMessage) return exceptionMessage;

  if (Array.isArray(err)) {
    for (const entry of err) {
      const parsed = parseSocketIoErrorMessage(entry);
      if (parsed) return parsed;
    }
    return undefined;
  }
  if (typeof err === "string") {
    const trimmed = err.trim();
    return trimmed || undefined;
  }
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") {
      const trimmed = message.trim();
      return trimmed || undefined;
    }
  }
  return undefined;
};
