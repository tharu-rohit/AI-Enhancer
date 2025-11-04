
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // remove data:mime/type;base64, prefix
    };
    reader.onerror = (error) => reject(error);
  });
};

export const extractVideoFrame = (videoFile: File, seekTo = 0.0): Promise<{ frame: string; aspectRatio: string; }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = seekTo;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameDataUrl = canvas.toDataURL('image/jpeg');
      
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const commonDivisor = gcd(video.videoWidth, video.videoHeight);
      const ratioW = video.videoWidth / commonDivisor;
      const ratioH = video.videoHeight / commonDivisor;
      const aspectRatio = `${ratioW}:${ratioH}`;
      
      URL.revokeObjectURL(video.src);
      resolve({ frame: frameDataUrl.split(',')[1], aspectRatio });
    };

    video.onerror = (e) => {
      reject(e);
      URL.revokeObjectURL(video.src);
    };

    video.play().catch(reject);
  });
};
