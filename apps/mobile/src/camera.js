// In-app camera controller for Meal capture.
// Uses getUserMedia (rear camera) for live viewfinder + canvas capture into private storage,
// producing both the full photo JPEG and a compact 200px thumbnail (~15 KB).

let activeStream = null;

export async function startViewfinder(videoEl) {
  stopViewfinder();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { ok: false, reason: 'Camera not available on this device' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
      audio: false,
    });
    activeStream = stream;
    if (videoEl) {
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      await videoEl.play();
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.message || 'Camera permission denied' };
  }
}

export async function setFlashMode(mode) {
  if (!activeStream) return false;
  const track = activeStream.getVideoTracks()[0];
  if (!track || typeof track.getCapabilities !== 'function') return false;
  const caps = track.getCapabilities();
  if (!caps || !caps.torch) return false;
  try {
    await track.applyConstraints({
      advanced: [{ torch: mode === 'on' }],
    });
    return true;
  } catch (_) {
    return false;
  }
}

export function stopViewfinder() {
  if (activeStream) {
    activeStream.getTracks().forEach((t) => t.stop());
    activeStream = null;
  }
}

export function captureVideoFrame(videoEl) {
  if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  const photoDataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const thumbnailDataUrl = makeThumbnailFromSource(canvas, canvas.width, canvas.height, 200);
  return { photoDataUrl, thumbnailDataUrl };
}

export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const photoDataUrl = reader.result;
        const thumbnailDataUrl = makeThumbnailFromSource(img, img.width, img.height, 200);
        resolve({ photoDataUrl, thumbnailDataUrl });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function makeThumbnailFromSource(source, srcW, srcH, targetSize) {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');

  // Center-crop square thumbnail (~200px, ~15 KB JPEG)
  const side = Math.min(srcW, srcH);
  const sx = (srcW - side) / 2;
  const sy = (srcH - side) / 2;
  ctx.drawImage(source, sx, sy, side, side, 0, 0, targetSize, targetSize);
  return canvas.toDataURL('image/jpeg', 0.72);
}
