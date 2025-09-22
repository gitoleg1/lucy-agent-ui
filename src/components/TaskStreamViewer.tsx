'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ConnStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'stopped' | 'error';

type KnownEvent = 'started' | 'heartbeat' | 'done' | 'failed' | 'canceled' | 'message';

interface Row {
  ts: string;          // חותמת זמן להצגה
  event: KnownEvent;   // סוג האירוע
  raw: string;         // טקסט גולמי להצגה/דיבוג
}

interface Props {
  apiBaseDefault?: string;
  taskIdDefault?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export default function TaskStreamViewer({
  apiBaseDefault = 'http://127.0.0.1:8000',
  taskIdDefault = 'demo-123',
}: Props) {
  const [apiBase, setApiBase] = useState<string>(apiBaseDefault);
  const [apiKey, setApiKey] = useState<string>('');
  const [taskId, setTaskId] = useState<string>(taskIdDefault);

  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [rows, setRows] = useState<Row[]>([]);

  // בקרים פנימיים
  const esRef = useRef<EventSource | null>(null);
  const reconnectWantedRef = useRef<boolean>(true);
  const reachedFinalRef = useRef<boolean>(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canStart = useMemo(
    () => apiBase.trim().length > 0 && taskId.trim().length > 0 && connStatus !== 'open' && connStatus !== 'connecting',
    [apiBase, taskId, connStatus],
  );

  const canStop = useMemo(
    () => connStatus === 'open' || connStatus === 'connecting',
    [connStatus],
  );

  const addRow = useCallback((event: KnownEvent, raw: string) => {
    setRows(prev => [{ ts: nowIso(), event, raw }, ...prev].slice(0, 1000));
  }, []);

  const closeES = useCallback(() => {
    if (esRef.current) {
      try { esRef.current.close(); } catch { /* ignore */ }
      esRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!reconnectWantedRef.current) return;
    if (reachedFinalRef.current) return;
    if (reconnectTimerRef.current) return; // כבר מתוזמן

    // דיליי קטן כדי לא להציף
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, 1200);
  }, []);

  const connect = useCallback(() => {
    if (!reconnectWantedRef.current) return;
    if (connStatus === 'open' || connStatus === 'connecting') return;

    const url = `${apiBase.replace(/\/+$/, '')}/stream/tasks/${encodeURIComponent(taskId)}?apikey=${encodeURIComponent(apiKey)}`;
    const es = new EventSource(url);
    esRef.current = es;
    setConnStatus('connecting');

    es.onopen = () => setConnStatus('open');

    es.onerror = () => {
      addRow('message', '[onerror] בעיית רשת/שרת');
      setConnStatus('error');
      closeES();
      scheduleReconnect();
    };

    es.onmessage = (ev: MessageEvent) => {
      addRow('message', ev.data ?? '');
    };

    const handleNamed = (name: KnownEvent) => (ev: MessageEvent) => {
      addRow(name, ev.data ?? '');

      if (name === 'done' || name === 'failed' || name === 'canceled') {
        reachedFinalRef.current = true;
        setConnStatus('closed');
        reconnectWantedRef.current = false; // לא לרה-קונקט אחרי סיום סופי
        closeES();
      }
    };

    es.addEventListener('started', handleNamed('started'));
    es.addEventListener('heartbeat', handleNamed('heartbeat'));
    es.addEventListener('done', handleNamed('done'));
    es.addEventListener('failed', handleNamed('failed'));
    es.addEventListener('canceled', handleNamed('canceled'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, taskId, apiKey, addRow, closeES, scheduleReconnect, connStatus]);

  // ניקוי טיימר/ES ביציאה
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      closeES();
    };
  }, [closeES]);

  const handleStart = useCallback(() => {
    reachedFinalRef.current = false;
    reconnectWantedRef.current = true;
    setRows([]);             // ניקוי לוג למסכת חדשה
    connect();
  }, [connect]);

  const handleStop = useCallback(() => {
    reconnectWantedRef.current = false;
    setConnStatus('stopped');
    closeES();
  }, [closeES]);

  const statusBadge = useMemo(() => {
    const map: Record<ConnStatus, string> = {
      idle: 'bg-gray-200 text-gray-700',
      connecting: 'bg-amber-100 text-amber-800',
      open: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-700',
      stopped: 'bg-rose-100 text-rose-800',
      error: 'bg-red-100 text-red-800',
    };
    return map[connStatus] ?? map.idle;
  }, [connStatus]);

  return (
    <div className="space-y-5">
      {/* טופס חיבור */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">הגדרות חיבור</h3>
          <span className={`tag ${statusBadge.replace('bg-', 'bg-').replace('text-', 'text-')}`}>
            סטטוס: {connStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">API Base</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="http://127.0.0.1:8000"
              inputMode="url"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-600">API Key</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="הדבק כאן את המפתח"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-600">TASK_ID</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="demo-123"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            />
          </label>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            className={`rounded px-4 py-2 text-white ${canStart ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
            disabled={!canStart}
            onClick={handleStart}
            title={canStart ? 'התחל צפייה' : 'השלים שדות נדרשים או נתק קודם'}
          >
            התחל צפייה
          </button>

          <button
            className={`rounded px-4 py-2 text-white ${canStop ? 'bg-rose-600 hover:bg-rose-700' : 'bg-gray-400 cursor-not-allowed'}`}
            disabled={!canStop}
            onClick={handleStop}
            title="עצור"
          >
            עצור
          </button>
        </div>
      </div>

      {/* לוג אירועים */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">אירועים אחרונים</h3>
          <span className="text-sm text-gray-500">מוצגים עד 1000 אחרונים</span>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <table>
            <thead>
              <tr className="text-left text-sm text-gray-600">
                <th className="w-[220px]">זמן</th>
                <th className="w-[140px]">אירוע</th>
                <th>תוכן</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.length === 0 ? (
                <tr><td colSpan={3} className="py-6 text-center text-gray-500">אין אירועים עדיין</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i}>
                  <td className="font-mono text-[12.5px] text-gray-600">{r.ts}</td>
                  <td>
                    <span className="tag">
                      {r.event}
                    </span>
                  </td>
                  <td>
                    <pre className="text-[12.5px] leading-5 whitespace-pre-wrap break-words">{r.raw}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
