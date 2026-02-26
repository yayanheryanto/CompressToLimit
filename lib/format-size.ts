export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024);
}

export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024;
}
