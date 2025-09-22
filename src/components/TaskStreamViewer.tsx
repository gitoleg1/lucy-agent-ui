"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  /** כתובת בסיס ל-API, אופציונלי. אם לא יימסר נשתמש ב-env או בברירת מחדל מקומית */
  apiBaseDefault?: string;
  /** מזהה משימה לפתיחה ראשונית (אופציונלי) */
  taskIdDefault?: string;
};

type StreamEvent =
  | { type: "open" }
  | { type: "message"; data: any }
  | { type: "error"; error: string }
  | { type: "close"; code?: number; reason?: string };

function resolveApiBase(explicit?: string) {
  if (explicit && explicit.trim()) return explicit.trim();
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_AGENT_BASE)
    return process.env.NEXT_PUBLIC_AGENT_BASE!;
  return "http://127.0.0.1:8000";
}

export default function TaskStreamViewer({
  apiBaseDefault,
  taskIdDefault,
}: Props) {
  const [apiBase, setApiBase] = useState<string>(() => resolveApiBase(apiBaseDefault));
  const [taskId, setTaskId] = useState<string>(() => taskIdDefault ?? "");
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const streamUrl = useMemo(() => {
    if (!taskId) return "";
    const base = apiBase.replace(/\/+$/, "");
    return `${base}/tasks/${encodeURIComponent(taskId)}/stream`;
  }, [apiBase, taskId]);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnected(false);
    setEvents((prev) => [...prev, { type: "close" }]);
  }, []);

  const connect = useCallback(() => {
    if (!streamUrl) return;

    // נקה חיבור קודם אם יש
    if (esRef.current) esRef.current.close();

    const es = new EventSource(streamUrl);
    esRef.current = es;
    setConnected(true);
    setEvents([{ type: "open" }]);

    es.onmessage = (e) => {
      try {
        const data = e.data ? JSON.parse(e.data) : null;
        setEvents((prev) => [...prev, { type: "message", data }]);
      } catch {
        setEvents((prev) => [...prev, { type: "message", data: e.data }]);
      }
    };

    es.onerror = () => {
      setEvents((prev) => [...prev, { type: "error", error: "Stream error" }]);
      // EventSource במצב שגיאה—נסגור כדי לא להיתקע
      es.close();
      setConnected(false);
    };
  }, [streamUrl]);

  // נתק כשעוזבים את הדף
  useEffect(() => {
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <label className="md:col-span-2 block">
          <div className="text-sm text-gray-500 mb-1">API Base</div>
          <input
            className="w-full rounded-2xl border p-2"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="http://127.0.0.1:8000"
          />
        </label>

        <label className="block">
          <div className="text-sm text-gray-500 mb-1">Task ID</div>
          <input
            className="w-full rounded-2xl border p-2"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            placeholder="e.g. abc123"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          className="rounded-2xl px-4 py-2 border shadow disabled:opacity-50"
          onClick={connect}
          disabled={!taskId || connected}
        >
          Connect
        </button>
        <button
          className="rounded-2xl px-4 py-2 border shadow disabled:opacity-50"
          onClick={disconnect}
          disabled={!connected}
        >
          Disconnect
        </button>
      </div>

      <div className="rounded-2xl border p-3 max-h-96 overflow-auto">
        {events.length === 0 ? (
          <div className="text-gray-500">No events yet.</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {events.map((ev, i) => {
              if (ev.type === "open") return <li key={i}>🟢 stream opened</li>;
              if (ev.type === "close")
                return <li key={i}>⚪ stream closed</li>;
              if (ev.type === "error")
                return <li key={i}>🔴 error: {ev.error}</li>;
              return (
                <li key={i}>
                  <pre className="whitespace-pre-wrap break-words">
                    {typeof ev.data === "string"
                      ? ev.data
                      : JSON.stringify(ev.data, null, 2)}
                  </pre>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
