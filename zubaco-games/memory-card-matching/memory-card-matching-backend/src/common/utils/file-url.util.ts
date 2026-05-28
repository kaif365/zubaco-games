import { config } from "@config";

/**
 * Build the public CDN URL for an uploaded file key.
 *
 * @param {string} key - file key value.
 *
 * @returns {string} The public file URL result.
 */
export function buildPublicFileUrl(key: string): string {
  const domain = config.aws.cloudfrontDomain
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  return `https://${domain}/${key.replace(/^\/+/, "")}`;
}
