"use client";
import React, { useEffect, useState } from "react";
import { Users, ShieldAlert, Image as ImageIcon, Calendar, Tag, Trash2 } from "lucide-react";
import Link from "next/link";
import { getApiUrl } from "../../lib/api";

interface Suspect {
  RekognitionId: string;
  FullName: string;
  CrimeType: string;
  WantedStatus: string;
  S3Key: string;
  MugshotUrl?: string;
  CreatedAt?: string;
}

export default function SuspectsGalleryPage() {
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSuspects = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/suspects`);
      const data = await res.json();
      setSuspects(data.suspects || []);
    } catch (err) {
      console.error("Error fetching suspects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuspects();
  }, []);

  const handleDelete = async (rekognitionId: string, fullName: string) => {
    if (!confirm(`Are you sure you want to permanently purge ${fullName} from DynamoDB, Rekognition, and S3?`)) {
      return;
    }

    setDeletingId(rekognitionId);
    try {
      const res = await fetch(`${getApiUrl()}/api/suspects/${rekognitionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuspects((prev) => prev.filter((s) => s.RekognitionId !== rekognitionId));
      } else {
        alert("Failed to delete suspect from cloud.");
      }
    } catch (err) {
      console.error("Error deleting suspect:", err);
      alert("Failed to connect to server.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 mt-4">
      <div className="flex justify-between items-center bg-gray-900 p-5 rounded-xl border border-gray-800 shadow">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="text-red-500" size={22} /> Indexed Suspect Database
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Biometric profiles registered in Amazon DynamoDB with mugshots stored in Amazon S3.
          </p>
        </div>

        <Link
          href="/register"
          className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
        >
          + Register New Suspect
        </Link>
      </div>

      {loading ? (
        <div className="p-16 text-center text-gray-500 text-sm">Querying DynamoDB records...</div>
      ) : suspects.length === 0 ? (
        <div className="bg-gray-900 p-12 rounded-xl border border-gray-800 text-center text-gray-400 flex flex-col items-center">
          <Users size={40} className="text-gray-600 mb-3" />
          <p className="font-semibold">No suspects indexed in the database yet.</p>
          <p className="text-xs text-gray-500 mt-1">Register a suspect with a photo to start biometric surveillance.</p>
          <Link
            href="/register"
            className="mt-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded transition"
          >
            Go to Registration
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {suspects.map((suspect) => (
            <div
              key={suspect.RekognitionId}
              className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg hover:border-red-900/60 transition group flex flex-col"
            >
              {/* Mugshot Image */}
              <div className="relative aspect-[4/3] bg-black overflow-hidden border-b border-gray-800 flex items-center justify-center">
                {suspect.MugshotUrl ? (
                  <img
                    src={suspect.MugshotUrl}
                    alt={suspect.FullName}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-600">
                    <ImageIcon size={32} />
                    <span className="text-xs mt-1">Photo In Vault</span>
                  </div>
                )}
                <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase shadow ${
                  suspect.WantedStatus === "WANTED"
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-yellow-600 text-black"
                }`}>
                  {suspect.WantedStatus}
                </span>
              </div>

              {/* Suspect Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-lg text-white group-hover:text-red-400 transition">
                      {suspect.FullName}
                    </h3>
                    <button
                      onClick={() => handleDelete(suspect.RekognitionId, suspect.FullName)}
                      disabled={deletingId === suspect.RekognitionId}
                      title="Delete Suspect from Cloud"
                      className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-gray-800 transition disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Tag size={12} className="text-red-500" /> {suspect.CrimeType}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-800/80 text-[10px] text-gray-500 font-mono space-y-1">
                  <p className="truncate">Rekognition ID: {suspect.RekognitionId}</p>
                  {suspect.CreatedAt && (
                    <p className="flex items-center gap-1">
                      <Calendar size={10} /> {new Date(suspect.CreatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
