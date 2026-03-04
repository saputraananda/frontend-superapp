import { useEffect, useMemo, useState } from "react";

export default function PerformanceRating() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const [info, setInfo] = useState({
    downMbps: null,
    upMbps: null,
    pingMs: null,
    effectiveType: null,
    rtt: null,
    downlink: null,
    saveData: null
  });

  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  // --- Helpers
  const formatMbps = (v) => (v == null ? "—" : `${v.toFixed(1)} Mbps`);
  const formatMs = (v) => (v == null ? "—" : `${Math.round(v)} ms`);

  // Simple bars based on Mbps
  const signalLevel = useMemo(() => {
    const d = info.downMbps ?? info.downlink ?? 0;
    if (!online) return 0;
    if (d >= 25) return 4;
    if (d >= 10) return 3;
    if (d >= 3) return 2;
    if (d > 0) return 1;
    return 1;
  }, [info.downMbps, info.downlink, online]);

  // Network Information API (Chrome/Android mostly)
  useEffect(() => {
    const updateFromConnection = () => {
      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c) return;
      setInfo((prev) => ({
        ...prev,
        effectiveType: c.effectiveType ?? prev.effectiveType,
        rtt: c.rtt ?? prev.rtt,
        downlink: c.downlink ?? prev.downlink,
        saveData: c.saveData ?? prev.saveData
      }));
    };

    updateFromConnection();
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c?.addEventListener) c.addEventListener("change", updateFromConnection);

    return () => {
      if (c?.removeEventListener) c.removeEventListener("change", updateFromConnection);
    };
  }, []);

  // Online/offline listeners
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // --- Speed test (lightweight)
  const runTest = async () => {
    if (!online) return;

    setLoading(true);

    try {
      // 1) ping: measure fetch round-trip (approx)
      const pingStart = performance.now();
      await fetch("https://www.google.com/favicon.ico?_=" + Date.now(), {
        cache: "no-store",
        mode: "no-cors"
      });
      const ping = performance.now() - pingStart;

      // 2) download speed: fetch a small file (cache-bypass)
      // you can replace URL with your own static file on your domain for better accuracy
      const url = "/speed/1mb.bin?_=" + Date.now();
      const t0 = performance.now();
      const res = await fetch(url, { cache: "no-store" });
      const blob = await res.blob();
      const t1 = performance.now();
      const bytes = blob.size;
      const seconds = Math.max((t1 - t0) / 1000, 0.001);
      const downMbps = (bytes * 8) / seconds / 1_000_000;

      // 3) upload speed: optional (estimate) by posting small payload
      // Some endpoints block POST. We'll do a conservative estimate by timing a request to httpbin.
      let upMbps = null;
      try {
        const payload = new Uint8Array(256 * 1024); // 256KB
        const u0 = performance.now();
        await fetch("https://httpbin.org/post", {
          method: "POST",
          body: payload,
          cache: "no-store"
        });
        const u1 = performance.now();
        const upSeconds = Math.max((u1 - u0) / 1000, 0.001);
        upMbps = (payload.byteLength * 8) / upSeconds / 1_000_000;
      } catch {
        // ignore if blocked by CORS/network
        upMbps = null;
      }

      setInfo((prev) => ({
        ...prev,
        pingMs: ping,
        downMbps,
        upMbps
      }));
      setUpdatedAt(new Date());
    } catch (e) {
      console.error("Error during speed test:", e);
      // fallback: keep any connection API values
      setInfo((prev) => ({
        ...prev,
        pingMs: prev.pingMs ?? prev.rtt ?? null
      }));
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  };

  // Auto run once on mount + refresh interval
  useEffect(() => {
    runTest();
    const id = setInterval(runTest, 60_000); // every 60s
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const statusText = online ? "Online" : "Offline";
  const statusClass = online
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : "text-rose-700 bg-rose-50 border-rose-200";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-800">Internet Speed</h3>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusClass}`}>
            {statusText}
          </span>

          <button
            type="button"
            onClick={runTest}
            disabled={loading || !online}
            className="h-8 px-3 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-100 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Testing..." : "Test"}
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Top row: signal + meta */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Signal bars */}
            <div className="flex items-end gap-1">
              {[1, 2, 3, 4].map((b) => (
                <div
                  key={b}
                  className={`w-2 rounded-sm transition ${b <= signalLevel ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  style={{ height: 6 + b * 4 }}
                />
              ))}
            </div>

            <div>
              <p className="text-xs text-slate-500 font-medium">Latency</p>
              <p className="text-sm font-bold text-slate-800">{formatMs(info.pingMs ?? info.rtt)}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium">Connection</p>
            <p className="text-sm font-semibold text-slate-700">
              {info.effectiveType ? info.effectiveType.toUpperCase() : "—"}
              {info.saveData ? <span className="text-slate-400"> · Save-Data</span> : null}
            </p>
          </div>
        </div>

        {/* Speeds */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500 font-medium">Download</p>
            <p className="mt-1 text-lg font-bold text-slate-800">
              {info.downMbps != null ? formatMbps(info.downMbps) : (info.downlink != null ? `${info.downlink} Mbps` : "—")}
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    ((info.downMbps ?? info.downlink ?? 0) / 30) * 100
                  )}%`
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500 font-medium">Upload</p>
            <p className="mt-1 text-lg font-bold text-slate-800">
              {formatMbps(info.upMbps)}
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-2 rounded-full bg-indigo-600 transition-all"
                style={{
                  width: `${Math.min(100, ((info.upMbps ?? 0) / 15) * 100)}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "—"}
          </span>
          <span className="text-slate-400">
            *Estimasi (browser)
          </span>
        </div>
      </div>
    </div>
  );
}