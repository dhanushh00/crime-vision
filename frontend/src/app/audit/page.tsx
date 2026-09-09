"use client";
import React, { useEffect, useState } from "react";
import { History, Download, Trash2, Search, Filter, ShieldAlert, CheckCircle } from "lucide-react";
import { getApiUrl } from "../../lib/api";

interface AuditLog {
  id: string;
  timestamp: string;
  match: boolean;
  fullname: string;
  crime: string;
  status: string;
  confidence: number;
  mugshot_url: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/audit-logs`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const clearLogs = async () => {
    if (!confirm("Are you sure you want to clear the audit history?")) return;
    try {
      await fetch(`${getApiUrl()}/api/audit-logs`, { method: "DELETE" });
      setLogs([]);
    } catch (err) {
      console.error("Error clearing logs:", err);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Log ID", "Timestamp (UTC)", "Match Result", "Subject Name", "Offense Category", "Wanted Status", "Confidence (%)"];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      l.match ? "MATCH" : "NO MATCH",
      `"${l.fullname}"`,
      `"${l.crime}"`,
      l.status,
      l.confidence
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crimevision_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.fullname.toLowerCase().includes(search.toLowerCase()) ||
                          l.crime.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === "ALL") return matchesSearch;
    if (statusFilter === "WANTED") return matchesSearch && l.status === "WANTED";
    if (statusFilter === "NO_MATCH") return matchesSearch && !l.match;
    return matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900 p-5 rounded-xl border border-gray-800 shadow">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="text-red-500" size={22} /> Surveillance Audit Logs
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Cryptographic timestamped log of all biometric recognition and identity verification scans.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Download size={14} /> Export CSV Report
          </button>
          <button
            onClick={clearLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-2 bg-red-950/60 hover:bg-red-900 text-red-400 text-xs font-semibold px-3 py-2 rounded-lg transition border border-red-900/60 disabled:opacity-50"
          >
            <Trash2 size={14} /> Clear History
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by suspect name or offense category..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex gap-2">
          {["ALL", "WANTED", "NO_MATCH"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                statusFilter === st
                  ? "bg-red-600 text-white"
                  : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Loading surveillance records...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No audit records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-950 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <tr>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Offense</th>
                  <th className="py-3.5 px-4">Confidence</th>
                  <th className="py-3.5 px-4">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-4 flex items-center gap-3">
                      {log.mugshot_url ? (
                        <img
                          src={log.mugshot_url}
                          alt={log.fullname}
                          className="w-10 h-10 rounded object-cover border border-gray-700 bg-black"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 font-mono text-xs">
                          {log.match ? "IMG" : "N/A"}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white text-sm">{log.fullname}</p>
                        <p className="text-[11px] text-gray-500 font-mono">ID: {log.id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {log.match ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                          log.status === "WANTED"
                            ? "bg-red-900/60 text-red-300 border border-red-700"
                            : "bg-yellow-900/60 text-yellow-300 border border-yellow-700"
                        }`}>
                          <ShieldAlert size={12} /> {log.status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-green-900/40 text-green-400 border border-green-800">
                          <CheckCircle size={12} /> CLEAR
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{log.crime}</td>
                    <td className="py-3 px-4 font-mono">
                      {log.match ? (
                        <span className="text-green-400 font-bold">{log.confidence}%</span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
