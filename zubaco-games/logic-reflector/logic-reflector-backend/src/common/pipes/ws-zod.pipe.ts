import { PipeTransform, Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { ZodType } from "zod";

@Injectable()
export class WsZodPipe<T> implements PipeTransform {
  /**
   * Create a new instance.
   *
   * @param {ZodType<T>} schema - schema value.
   */
  constructor(private readonly schema: ZodType<T>) {}

  /**
   * Transform the incoming value.
   *
   * @param {unknown} value - Incoming value to validate.
   *
   * @returns {T} The transform result.
   */
  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      throw new WsException(message);
    }
    return result.data;
  }
}
