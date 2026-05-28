import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Context, ObjectContext } from "@restatedev/restate-sdk";

const tracer = trace.getTracer("restate");

/**
 * Wrap every handler in a Restate object/service definition with an OTel span.
 * The span name is `restate:<serviceName>/<handlerName>`.
 * For Virtual Objects, `restate.key` is automatically added from `ctx.key()`.
 *
 * @param {string} serviceName - Restate service or virtual-object name.
 * @param {T} handlers - Handler map to wrap.
 *
 * @returns {T} The wrapped handler map.
 */
type RestateHandler = (
  ctx: Context | ObjectContext,
  req: unknown,
) => Promise<unknown>;

export function wrapRestateHandlers<T extends Record<string, RestateHandler>>(
  serviceName: string,
  handlers: T,
): T {
  return Object.fromEntries(
    Object.entries(handlers).map(([handlerName, handler]) => [
      handlerName,
      async (ctx: Context | ObjectContext, req: unknown) => {
        const attrs: Record<string, string> = {
          "restate.service": serviceName,
          "restate.handler": handlerName,
        };
        try {
          attrs["restate.key"] = (ctx as ObjectContext).key;
        } catch {
          // plain service Context — key getter throws, safe to skip
        }
        return tracer.startActiveSpan(
          `restate:${serviceName}/${handlerName}`,
          { attributes: attrs },
          async (span) => {
            try {
              return await handler(ctx, req);
            } catch (err) {
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: String(err),
              });
              throw err;
            } finally {
              span.end();
            }
          },
        );
      },
    ]),
  ) as T;
}
