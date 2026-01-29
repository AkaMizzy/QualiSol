/**
 * Checks if a filename or URL represents a video file based on its extension.
 * @param filename - The filename or URL to check.
 * @returns True if the file is a video, false otherwise.
 */
export const isVideoFile = (filename: string | null): boolean => {
  if (!filename) return false;
  const videoExtensions = ["mp4", "mov", "avi", "webm", "mkv"];
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? videoExtensions.includes(ext) : false;
};
