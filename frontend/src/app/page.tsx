"use client";
import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { ScanFace, AlertTriangle, CheckCircle, Camera, Upload, RotateCcw, ShieldAlert, UserCheck } from "lucide-react";

export default function ScannerPage() {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"webcam" | "upload">("webcam");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Convert base64 data URL to File object
  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const executeRecognition = async (file: File) => {
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/recognize", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Scanning Error:", error);
      setResult({ match: false, message: "Connection to server failed." });
    } finally {
      setLoading(false);
    }
  };

  const captureAndScan = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setPreviewImage(imageSrc);
    const file = dataURLtoFile(imageSrc, "snapshot.jpg");
    await executeRecognition(file);
  }, [webcamRef]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      setPreviewImage(reader.result as string);
      await executeRecognition(file);
    };
    reader.readAsDataURL(file);
  };

  const resetScanner = () => {
    setPreviewImage(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Mode Switcher */}
      <div className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800 shadow">
        <div className="flex gap-2">
          <button
            onClick={() => { setMode("webcam"); resetScanner(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              mode === "webcam" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Camera size={16} /> Live Webcam
          </button>
          <button
            onClick={() => { setMode("upload"); resetScanner(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
              mode === "upload" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Upload size={16} /> Upload Photo
          </button>
        </div>

        {previewImage && (
          <button
            onClick={resetScanner}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded transition"
          >
            <RotateCcw size={14} /> Reset Scanner
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Video / Image Viewport */}
        <div className="flex-1 bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-xl flex flex-col items-center">
          <div className="relative w-full max-w-md aspect-[4/3] overflow-hidden rounded-lg border-2 border-dashed border-gray-700 bg-black flex items-center justify-center mb-4">
            {previewImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="Captured Suspect"
                  className="w-full h-full object-contain"
                />

                {/* Dynamic Rekognition Bounding Box */}
                {result?.match && result?.bounding_box && (
                  <div
                    className="absolute border-2 border-red-500 rounded shadow-lg pointer-events-none transition-all duration-300 animate-pulse"
                    style={{
                      left: `${result.bounding_box.Left * 100}%`,
                      top: `${result.bounding_box.Top * 100}%`,
                      width: `${result.bounding_box.Width * 100}%`,
                      height: `${result.bounding_box.Height * 100}%`,
                    }}
                  >
                    <div className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                      {result.criminal_data?.FullName || "MATCH"} ({result.confidence}%)
                    </div>
                  </div>
                )}
              </div>
            ) : mode === "webcam" ? (
              <div className="relative w-full h-full">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user" }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-red-500/40 rounded-lg"></div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center cursor-pointer p-8 text-center text-gray-400 hover:text-white"
              >
                <Upload size={40} className="mb-2 text-red-500" />
                <p className="text-sm font-medium">Click to select an image from your computer</p>
                <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WEBP</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {mode === "webcam" && !previewImage && (
            <button
              onClick={captureAndScan}
              disabled={loading}
              className="w-full max-w-md bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded flex justify-center items-center gap-2 transition-all disabled:opacity-50"
            >
              <ScanFace size={20} />
              {loading ? "Scanning Biometrics..." : "Snap & Identify"}
            </button>
          )}

          {mode === "upload" && !previewImage && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-md bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded flex justify-center items-center gap-2 transition-all"
            >
              <Upload size={18} /> Select Photo File
            </button>
          )}
        </div>

        {/* Right: Analysis & Profile Card */}
        <div className="flex-1 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl flex flex-col">
          <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
            <ScanFace size={20} className="text-red-500" /> Biometric Analysis
          </h2>

          {!result && (
            <div className="text-gray-500 flex-1 flex flex-col items-center justify-center h-64">
              <ScanFace size={48} className="text-gray-700 mb-3 animate-pulse" />
              <p className="text-sm">Awaiting biometric capture...</p>
              <p className="text-xs text-gray-600 mt-1">Take a webcam snapshot or upload an image to scan</p>
            </div>
          )}

          {result && !result.match && (
            <div className="bg-green-900/20 border border-green-800 text-green-400 p-5 rounded-lg flex items-start gap-3">
              <CheckCircle className="mt-0.5" size={24} />
              <div>
                <h3 className="font-bold text-lg">No Criminal Record Found</h3>
                <p className="text-sm text-gray-300 mt-1">{result.message}</p>
                <div className="mt-3 text-xs text-green-500 font-mono">
                  AWS Rekognition Status: 0 matches above threshold (80%)
                </div>
              </div>
            </div>
          )}

          {result && result.match && result.criminal_data && (
            <div className="bg-red-950/40 border border-red-800/80 p-5 rounded-lg flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-red-900/50 pb-2">
                <div className="flex items-center gap-2 text-red-400 font-bold tracking-wider uppercase text-sm">
                  <ShieldAlert size={18} /> Biometric Match Confirmed
                </div>
                <span className="font-mono text-xs font-bold text-green-400 bg-green-950/80 px-2 py-0.5 rounded border border-green-800">
                  {result.confidence}% Match
                </span>
              </div>

              {/* Side-by-side Official Mugshot vs Live Scan */}
              {result.mugshot_url && (
                <div className="flex items-center gap-4 bg-gray-950 p-3 rounded-lg border border-red-900/50">
                  <div className="relative w-24 h-24 rounded-md overflow-hidden border border-red-500/60 flex-shrink-0 bg-black">
                    <img
                      src={result.mugshot_url}
                      alt={result.criminal_data.FullName}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-bold text-center text-gray-300 uppercase py-0.5">
                      DATABASE FILE
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    <p className="font-bold text-white text-sm">Official Record Mugshot</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Matched from Amazon S3 mugshot vault</p>
                    <div className="flex items-center gap-1 text-[11px] text-green-400 font-mono mt-1.5">
                      <UserCheck size={13} /> Biometric Verification Verified
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Full Name</span>
                  <p className="text-xl font-extrabold text-white">{result.criminal_data.FullName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Wanted Status</span>
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase mt-1 ${
                      result.criminal_data.WantedStatus === "WANTED"
                        ? "bg-red-600 text-white animate-pulse"
                        : "bg-yellow-600 text-black"
                    }`}>
                      {result.criminal_data.WantedStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Offense Category</span>
                <p className="text-md font-semibold text-gray-200">{result.criminal_data.CrimeType}</p>
              </div>

              <div className="text-[11px] text-gray-500 font-mono pt-2 border-t border-gray-800/80">
                Rekognition ID: {result.criminal_data.RekognitionId}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}