// Real audio recorder for Voice Journal (32 kbps Opus when supported).
// Used exclusively for the personal journal, up to a 60s hard maximum.

let mediaStream = null;
let mediaRecorder = null;
let chunks = [];
let recordedBlob = null;
let recordedUrl = null;
let chosenExt = 'opus';

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return { mime: '', ext: 'opus' };
  const candidates = [
    { mime: 'audio/ogg;codecs=opus', ext: 'opus' },
    { mime: 'audio/webm;codecs=opus', ext: 'webm' },
    { mime: 'audio/webm', ext: 'webm' },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: '', ext: 'webm' };
}

export async function startAudioCapture() {
  cleanupAudioCapture();
  chunks = [];
  recordedBlob = null;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
    return { ok: false, reason: 'Microphone unavailable; timer-only fallback active' };
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const picked = pickMimeType();
    chosenExt = picked.ext;
    const opts = { audioBitsPerSecond: 32000 };
    if (picked.mime) opts.mimeType = picked.mime;

    mediaRecorder = new MediaRecorder(mediaStream, opts);
    mediaRecorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };
    mediaRecorder.start(250);
    return { ok: true, ext: chosenExt };
  } catch (err) {
    return { ok: false, reason: err?.message || 'Microphone permission denied' };
  }
}

export function stopAudioCapture() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      stopTracks();
      resolve({ blob: recordedBlob, url: recordedUrl, ext: chosenExt });
      return;
    }

    mediaRecorder.onstop = () => {
      const mime = mediaRecorder?.mimeType || 'audio/webm';
      recordedBlob = new Blob(chunks, { type: mime });
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      recordedUrl = URL.createObjectURL(recordedBlob);
      stopTracks();
      resolve({ blob: recordedBlob, url: recordedUrl, ext: chosenExt });
    };

    try {
      mediaRecorder.stop();
    } catch (_) {
      stopTracks();
      resolve({ blob: null, url: null, ext: chosenExt });
    }
  });
}

export function getRecordedAudioUrl() {
  return recordedUrl;
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to encode audio'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export function getRecordedBlob() {
  return { blob: recordedBlob, ext: chosenExt };
}

export function cleanupAudioCapture() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
    } catch (_) {}
  }
  mediaRecorder = null;
  stopTracks();
  chunks = [];
  recordedBlob = null;
  if (recordedUrl) {
    URL.revokeObjectURL(recordedUrl);
    recordedUrl = null;
  }
}

function stopTracks() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
}
