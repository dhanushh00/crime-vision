export const getApiUrl = (): string => {
  if (typeof window !== "undefined") {
    // Automatically uses current hostname (e.g. 3.108.59.197 or localhost) with port 8000
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
};
