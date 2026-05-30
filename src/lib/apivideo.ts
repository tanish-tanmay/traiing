export const uploadVideoToApiVideo = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<{ videoUrl: string; duration: number }> => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Fetch upload token from backend
  const tokenRes = await fetch('/api/apivideo-token');
  if (!tokenRes.ok) {
    const errorData = await tokenRes.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get upload token');
  }
  
  const { token } = await tokenRes.json();

  if (!token) {
    throw new Error('Upload token is missing');
  }

  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `https://sandbox.api.video/upload?token=${token}`;
    
    console.log(`Uploading to: ${url}`);
    
    xhr.open('POST', url, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        console.log('Upload success response:', response);
        
        resolve({
          videoUrl: response.assets.hls || response.assets.player || response.assets.mp4,
          duration: response.duration || 3600
        });
      } else {
        const errorRes = JSON.parse(xhr.responseText || '{}');
        console.error('Upload Error:', errorRes);
        reject(new Error(errorRes.title || 'Upload to api.video failed'));
      }
    };

    xhr.onerror = (e) => {
      console.error('Network error during upload:', e);
      reject(new Error('Network error during upload'));
    };

    xhr.send(formData);
  });
};
