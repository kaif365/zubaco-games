import axios from 'axios';

import { appConfig } from '@/app/config/appConfig';

interface UploadResponse {
  data?: {
    url?: string;
    key?: string;
  };
  url?: string;
  key?: string;
}

/**
 * Uploads a file to the configured file upload endpoint.
 * Returns the URL of the uploaded file.
 */
export async function uploadFile(file: File): Promise<string> {
  if (!appConfig.fileUpload.url) {
    throw new Error('File upload URL is not configured (VITE_FILE_UPLOAD_URL)');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<UploadResponse>(appConfig.fileUpload.url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-API-KEY': appConfig.fileUpload.apiKey,
    },
  });

  const data = response.data;

  // Handle both { data: { url: ... } } and { url: ... } formats
  let fileUrl = data.data?.url || data.url;

  // If no direct URL, check for key and prepend CDN base URL
  if (!fileUrl) {
    const key = data.data?.key || data.key;
    if (key) {
      const baseUrl = appConfig.game.cdnBaseUrl;
      fileUrl = baseUrl ? `${baseUrl}/${key}` : key;
    }
  }

  if (!fileUrl) {
    console.error('Upload response:', JSON.stringify(data, null, 2));
    throw new Error('Invalid upload response: URL not found');
  }

  return fileUrl;
}
