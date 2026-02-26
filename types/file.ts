export type SupportedMimeType = 'image/jpeg' | 'image/png' | 'application/pdf';

export interface UploadedFile {
  file: File;
  name: string;
  mimeType: SupportedMimeType;
  sizeMB: number;
  sizeFormatted: string;
  previewUrl?: string;
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  isWithinTarget: boolean;
  previewUrl?: string;
  fileName: string;
}

export type CompressionStatus = 'idle' | 'compressing' | 'done' | 'error';

export interface ProgressState {
  percent: number;
  label: string;
  step: string;
}
