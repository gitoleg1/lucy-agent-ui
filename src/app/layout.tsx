import './globals.css';

export const metadata = {
  title: 'Lucy Agent UI',
  description: 'Admin viewer',
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Lucy Admin</h1>
            <span className="text-sm text-gray-500">SSE Viewer</span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
