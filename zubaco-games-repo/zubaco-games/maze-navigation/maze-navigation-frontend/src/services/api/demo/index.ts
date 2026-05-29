import { logger } from "@/lib/default-logger";
import { httpGet } from "@/services/fetcher";
import { handleServerError } from "@/services/service-error-handler";
import URL from "@/services/urls";
import type { DemoSessionResponse } from "@/types/api/demo";

interface DemoApiEnvelope<T> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: T;
}

function unwrapDemoPayload<T>(payload: unknown, fallbackMessage: string): T {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "data" in payload
  ) {
    const envelope = payload as DemoApiEnvelope<T>;
    if (!envelope.success || envelope.data === undefined) {
      throw new Error(envelope.message ?? fallbackMessage);
    }
    return envelope.data;
  }
  return payload as T;
}

const getDemo = async (): Promise<DemoSessionResponse> => {
  try {
    const raw = await httpGet<unknown>(URL.USER_DEMO);
    return unwrapDemoPayload<DemoSessionResponse>(
      raw,
      "Failed to fetch demo puzzle",
    );
  } catch (error) {
    logger.error("Failed to fetch demo puzzle:", error);
    const { message, errors } = handleServerError(error);
    throw errors ?? message;
  }
};

const demoService = {
  getDemo,
};

export default demoService;
