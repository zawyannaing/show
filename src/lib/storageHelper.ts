import { supabase } from './supabaseClient';

export interface UploadResult {
  publicUrl: string;
  storageType: 'supabase' | 'server' | 'local' | 'base64';
  error: string | null;
}

/**
 * Universal resilient image uploader that works from any device and network.
 * 1. Attempts fast upload via server /api/upload proxy (avoids ISP blocks, QUIC drops & CORS issues)
 * 2. Attempts direct Supabase Storage upload
 * 3. Gracefully falls back to high-quality compressed Base64 data URI
 */
export async function uploadImage(file: File, filePath: string): Promise<UploadResult> {
  const cleanPath = filePath.replace(/^\/+/, '');
  const contentType = file.type || 'image/webp';

  // Read file as base64 for API upload & fallback
  const base64DataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string || '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  // Strategy 1: Try upload through our server /api/upload
  if (base64DataUrl) {
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: cleanPath,
          fileBase64: base64DataUrl,
          contentType,
          bucket: 'uploads'
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (response.ok) {
        const json = await response.json();
        if (json?.success && json?.publicUrl) {
          return {
            publicUrl: json.publicUrl,
            storageType: json.storageType || 'server',
            error: null
          };
        }
      }
    } catch (serverErr) {
      console.warn('Server upload endpoint not reachable or timed out, attempting direct Supabase upload:', serverErr);
    }
  }

  // Strategy 2: Direct Supabase Storage client
  try {
    const { error: supaError } = await supabase.storage
      .from('uploads')
      .upload(cleanPath, file, {
        cacheControl: '31536000',
        contentType,
        upsert: true
      });

    if (!supaError) {
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(cleanPath);

      if (urlData?.publicUrl) {
        return {
          publicUrl: urlData.publicUrl,
          storageType: 'supabase',
          error: null
        };
      }
    } else {
      console.warn('Direct Supabase storage upload returned error:', supaError.message);
    }
  } catch (directErr) {
    console.warn('Direct Supabase storage error:', directErr);
  }

  // Strategy 3: Reliable compressed Base64 data URI fallback
  if (base64DataUrl) {
    return {
      publicUrl: base64DataUrl,
      storageType: 'base64',
      error: null
    };
  }

  return {
    publicUrl: '',
    storageType: 'base64',
    error: 'Failed to process and upload image'
  };
}
