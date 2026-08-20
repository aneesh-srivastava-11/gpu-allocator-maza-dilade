"use client";

import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("[CAMERA ERROR]", err);
      setError("Camera access is required to take a live photo of your ID card. Gallery uploads are disabled by design.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedUrl(url);
          onCapture(blob);
          stopCamera();
        }
      }, "image/jpeg", 0.9);
    }
  };

  const handleRetake = () => {
    setCapturedUrl(null);
    startCamera();
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 aspect-video flex items-center justify-center">
        {capturedUrl ? (
          <img src={capturedUrl} alt="Captured Student ID" className="w-full h-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-100"
          />
        )}

        {/* Framing Overlay Guide */}
        {!capturedUrl && !error && (
          <div className="absolute inset-4 border-2 border-dashed border-orange-400/70 rounded-xl pointer-events-none flex flex-col justify-between p-3">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest bg-black/60 px-2 py-0.5 rounded w-fit">
              Center ID Card Here
            </span>
            <span className="text-[10px] text-slate-300 bg-black/60 px-2 py-0.5 rounded w-fit self-end">
              Live In-App Photo Only
            </span>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {error ? (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : capturedUrl ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <CheckCircle size={16} />
            <span>ID Photo Captured</span>
          </div>
          <button
            type="button"
            onClick={handleRetake}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Retake Photo</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleCapturePhoto}
          className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
        >
          <Camera size={16} />
          <span>Snap ID Card Photo</span>
        </button>
      )}
    </div>
  );
};
