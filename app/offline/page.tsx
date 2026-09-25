"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M9 10h.01M15 10h.01M12 16v.01" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">You&apos;re offline</h1>
        <p className="text-gray-500 text-sm mb-6">Check your connection and try again.</p>
        <button onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}
