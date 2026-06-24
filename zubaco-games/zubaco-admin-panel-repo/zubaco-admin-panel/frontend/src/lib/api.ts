/**
 * Admin API fetch wrapper.
 * Re-exports the existing apiRequest from the structured client.
 * Can be used directly for one-off requests.
 */
export { apiRequest as adminFetch } from "@/lib/api/client";
export { get, post, patch, del, put } from "@/lib/api/http";
