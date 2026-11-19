/**
 * Client-side Image Compressor
 * Automatically scales images to max 1200px and converts to WebP/JPEG format
 * before uploading to Supabase Storage, saving 80-95% bandwidth & storage.
 */

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  dimensions: { width: number; height: number };
  format: 'webp' | 'jpeg';
}

export interface CompressionOptions {
  maxDimension?: number; // Default: 1200px
  quality?: number;      // Default: 0.82 (balance of high sharpness and compact size)
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export async function compressImage(
  sourceFile: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const maxDim = options.maxDimension || 1200;
  const quality = options.quality ?? 0.82;
  const originalSize = sourceFile.size;

  return new Promise((resolve, reject) => {
    // If not an image, pass through unchanged
    if (!sourceFile.type.startsWith('image/')) {
      resolve({
        file: sourceFile,
        previewUrl: URL.createObjectURL(sourceFile),
        originalSize,
        compressedSize: originalSize,
        savingsPercent: 0,
        dimensions: { width: 0, height: 0 },
        format: 'jpeg'
      });
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Proportional resize if exceeds maxDimension
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Canvas fallback: return original
          resolve({
            file: sourceFile,
            previewUrl: URL.createObjectURL(sourceFile),
            originalSize,
            compressedSize: originalSize,
            savingsPercent: 0,
            dimensions: { width, height },
            format: 'jpeg'
          });
          return;
        }

        // Draw image smoothly on canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first, fallback to JPEG
        const tryExport = (mimeType: 'image/webp' | 'image/jpeg', formatName: 'webp' | 'jpeg') => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                if (mimeType === 'image/webp') {
                  // Fallback to jpeg
                  tryExport('image/jpeg', 'jpeg');
                } else {
                  // Fallback to original
                  resolve({
                    file: sourceFile,
                    previewUrl: URL.createObjectURL(sourceFile),
                    originalSize,
                    compressedSize: originalSize,
                    savingsPercent: 0,
                    dimensions: { width, height },
                    format: 'jpeg'
                  });
                }
                return;
              }

              const compressedSize = blob.size;
              // If compression somehow produced larger file than original, keep original
              if (compressedSize >= originalSize && originalSize < 200 * 1024) {
                resolve({
                  file: sourceFile,
                  previewUrl: URL.createObjectURL(sourceFile),
                  originalSize,
                  compressedSize: originalSize,
                  savingsPercent: 0,
                  dimensions: { width, height },
                  format: formatName
                });
                return;
              }

              // Create clean filename with new extension
              const baseName = sourceFile.name.replace(/\.[^/.]+$/, '');
              const newFileName = `${baseName}.${formatName}`;
              const compressedFile = new File([blob], newFileName, {
                type: mimeType,
                lastModified: Date.now()
              });

              const savingsPercent = Math.max(
                0,
                Math.round(((originalSize - compressedSize) / originalSize) * 100)
              );

              const previewUrl = URL.createObjectURL(blob);

              resolve({
                file: compressedFile,
                previewUrl,
                originalSize,
                compressedSize,
                savingsPercent,
                dimensions: { width, height },
                format: formatName
              });
            },
            mimeType,
            quality
          );
        };

        tryExport('image/webp', 'webp');
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(sourceFile);
  });
}
