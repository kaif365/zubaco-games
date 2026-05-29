import { describe, expect, it } from "vitest";

import {
  getSocketExceptionMessage,
  parseSocketExceptionPayload,
  parseSocketIoErrorMessage,
} from "@/utils/socket";

describe("socket exception parsing", () => {
  const envelope = {
    success: false,
    statusCode: 400,
    message: "RESTATE_UNAVAILABLE",
    data: null,
  };

  it("parses tuple payloads emitted as exception events", () => {
    expect(parseSocketExceptionPayload(["exception", envelope])).toEqual({
      success: false,
      statusCode: 400,
      message: "RESTATE_UNAVAILABLE",
      data: null,
    });
  });

  it("parses direct exception envelopes", () => {
    expect(parseSocketExceptionPayload(envelope)).toEqual({
      success: false,
      statusCode: 400,
      message: "RESTATE_UNAVAILABLE",
      data: null,
    });
  });

  it("ignores successful exception envelopes", () => {
    expect(
      parseSocketExceptionPayload({
        success: true,
        message: "OK",
        data: null,
      }),
    ).toBeNull();
  });

  it("extracts exception messages for generic socket error parsing", () => {
    expect(getSocketExceptionMessage(["exception", envelope])).toBe(
      "RESTATE_UNAVAILABLE",
    );
    expect(parseSocketIoErrorMessage(["exception", envelope])).toBe(
      "RESTATE_UNAVAILABLE",
    );
  });
});
