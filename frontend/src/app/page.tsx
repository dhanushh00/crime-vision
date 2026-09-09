"use client";
import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { ScanFace, AlertTriangle, CheckCircle } from "lucide-react";

export default function ScannerPage() {
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Helper function: Convert base64 webcam image to a File object
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

  const captureAndScan = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setLoading(true);
    setResult(null);

    const file = dataURLtoFile(imageSrc, "snapshot.jpg");
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Send to FastAPI backend
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
  }, [webcamRef]);

  return (
    <div className="flex flex-col md:flex-row gap-8 mt-8">
      <div className="flex-1 bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-xl flex flex-col items-center">
        <div className="relative w-full max-w-md overflow-hidden rounded-lg border-2 border-dashed border-gray-600 mb-6">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "user" }}
            className="w-full"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Visual target box overlay */}
            <div className="w-48 h-48 border-2 border-red-500/50 rounded-lg"></div>
          </div>
        </div>
        
        <button
          onClick={captureAndScan}
          disabled={loading}
          className="w-full max-w-md bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded flex justify-center items-center gap-2 transition-all disabled:opacity-50"
        >
          <ScanFace size={20} />
          {loading ? "Scanning Biometrics..." : "Scan & Identify"}
        </button>
      </div>

      <div className="flex-1 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
        <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Analysis Results</h2>
        
        {!result && (
          <div className="text-gray-500 flex flex-col items-center justify-center h-48">
            <p>Awaiting biometric input...</p>
          </div>
        )}

        {result && !result.match && (
          <div className="bg-green-900/30 border border-green-800 text-green-400 p-4 rounded-lg flex items-start gap-3">
            <CheckCircle className="mt-1" size={24} />
            <div>
              <h3 className="font-bold text-lg">No Match Found</h3>
              <p className="text-sm opacity-80">{result.message}</p>
            </div>
          </div>
        )}

        {result && result.match && result.criminal_data && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="mt-1" size={24} />
            <div className="w-full">
              <h3 className="font-bold text-xl uppercase tracking-wider mb-2">Match Confirmed</h3>
              <div className="bg-gray-950 p-4 rounded mt-2 border border-red-900/50">
                <p className="text-sm text-gray-400">Identity</p>
                <p className="text-lg font-bold text-white mb-2">{result.criminal_data.FullName}</p>
                
                <p className="text-sm text-gray-400">Offense Category</p>
                <p className="text-md text-white mb-2">{result.criminal_data.CrimeType}</p>
                
                <p className="text-sm text-gray-400">Current Status</p>
                <p className="text-md font-bold text-red-500 uppercase">{result.criminal_data.WantedStatus}</p>
                
                <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between">
                  <span className="text-xs text-gray-500">Confidence Score</span>
                  <span className="text-xs font-mono text-green-400">{result.confidence}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}