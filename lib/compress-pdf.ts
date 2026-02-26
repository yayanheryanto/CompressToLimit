import { formatSize } from './format-size';
import type { PDFDocument as PDFDocumentType } from 'pdf-lib';

type ProgressCallback = (percent: number, step: string) => void;

export async function compressPDF(
  file: File,
  targetBytes: number,
  onProgress?: ProgressCallback
): Promise<{ blob: Blob; wasAboveTarget: boolean }> {
  onProgress?.(10, 'Loading PDF document…');

  const { PDFDocument } = await import('pdf-lib');

  const arrayBuffer = await file.arrayBuffer();

  let pdfDoc: PDFDocumentType;
  try {
    pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch {
    throw new Error('Could not load PDF. The file may be corrupted or password-protected.');
  }

  onProgress?.(35, 'Stripping metadata…');

  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');
  pdfDoc.setCreationDate(new Date(0));
  pdfDoc.setModificationDate(new Date(0));

  onProgress?.(65, 'Re-encoding with object streams…');

  const pdfBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 100,
  });

  onProgress?.(90, `Checking size: ${formatSize(pdfBytes.byteLength)}`);

  
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const wasAboveTarget = blob.size > targetBytes;

  onProgress?.(100, 'Done.');

  return { blob, wasAboveTarget };
}
