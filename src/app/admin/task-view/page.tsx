import TaskStreamViewer from '../../../components/TaskStreamViewer';

export const metadata = { title: 'צפייה בזרם משימות (SSE) • Lucy' };

export default function Page() {
  // ערכי ברירת־מחדל: בסיס API מהסביבה (אם קיים), ו־TASK_ID לדמו
  const apiBaseDefault = process.env.NEXT_PUBLIC_AGENT_API_BASE ?? 'http://127.0.0.1:8000';
  const taskIdDefault = 'demo-123';

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">צפייה בזרם משימות (SSE)</h2>
      <p className="text-gray-600 text-sm">
        מלא את הפרטים ולחץ <span className="font-semibold">התחל צפייה</span>. הכפתור האדום עוצר חיבור קיים.
      </p>

      <TaskStreamViewer
        apiBaseDefault={apiBaseDefault}
        taskIdDefault={taskIdDefault}
      />
    </div>
  );
}
