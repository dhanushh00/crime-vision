"use client";
import React, { useState } from "react";
import { UploadCloud } from "lucide-react";
import { getApiUrl } from "../../lib/api";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch(`${getApiUrl()}/api/register`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      
      if (response.ok) {
        setMessage(`Success: ${data.message}`);
        (e.target as HTMLFormElement).reset();
      } else {
        setMessage(`Error: ${data.detail}`);
      }
    } catch (error) {
      setMessage("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
        <UploadCloud className="text-red-500" /> Register Suspect to Cloud
      </h2>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
          <input required name="fullname" type="text" className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:border-red-500 focus:outline-none" placeholder="e.g. John Doe" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Offense Category</label>
          <input required name="crime" type="text" className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:border-red-500 focus:outline-none" placeholder="e.g. Grand Theft Auto" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
          <select required name="status" className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:border-red-500 focus:outline-none">
            <option value="WANTED">WANTED</option>
            <option value="CLEARED">CLEARED</option>
            <option value="UNDER INVESTIGATION">UNDER INVESTIGATION</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Mugshot Image (JPEG/PNG)</label>
          <input required name="file" type="file" accept="image/*" className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-800 file:text-white hover:file:bg-gray-700" />
        </div>

        <button disabled={loading} type="submit" className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded transition-all disabled:opacity-50">
          {loading ? "Uploading & Indexing..." : "Index & Save to Cloud"}
        </button>

        {message && (
          <div className={`mt-4 p-4 rounded ${message.startsWith("Success") ? "bg-green-900/30 text-green-400 border border-green-800" : "bg-red-900/30 text-red-400 border border-red-800"}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}