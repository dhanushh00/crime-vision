/**
 * Returns the base API URL.
 * Since Next.js rewrites proxy all /api/* requests internally to the backend,
 * client-side calls use clean relative URLs (e.g. /api/register),
 * completely eliminating CORS and private address space issues.
 */
export const getApiUrl = (): string => {
  return "";
};
