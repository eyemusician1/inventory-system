import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ReviewBorrowLogs() {
  const navigate = useNavigate();

  // Placeholder data for the UI
  const mockLogs = [
    { id: 'LOG-001', student: '2023-0142 (Bayon-on, C.)', item: 'Microscope X1', date: 'Oct 24, 2026', status: 'Active' },
    { id: 'LOG-002', student: '2022-0991 (Smith, J.)', item: 'Epson Projector', date: 'Oct 23, 2026', status: 'Returned' },
    { id: 'LOG-003', student: '2024-1102 (Doe, A.)', item: 'Arduino Starter Kit', date: 'Oct 20, 2026', status: 'Overdue' },
  ];

  return (
    <div
      className="min-h-screen w-full bg-[#050B14] text-white p-6 md:p-12 flex flex-col items-center"
      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace" }}
    >
      <div className="w-full max-w-5xl">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-100/50 hover:text-white transition-colors mb-8"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold tracking-tight mb-2">Borrow Logs</h1>
        <p className="text-blue-100/50 mb-8">Review active and past equipment loans.</p>

        <div className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-5 text-sm tracking-widest text-blue-100/70 font-semibold uppercase">Log ID</th>
                <th className="p-5 text-sm tracking-widest text-blue-100/70 font-semibold uppercase">Borrower</th>
                <th className="p-5 text-sm tracking-widest text-blue-100/70 font-semibold uppercase">Item</th>
                <th className="p-5 text-sm tracking-widest text-blue-100/70 font-semibold uppercase">Date Borrowed</th>
                <th className="p-5 text-sm tracking-widest text-blue-100/70 font-semibold uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockLogs.map((log, index) => (
                <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-5 text-white/80">{log.id}</td>
                  <td className="p-5">{log.student}</td>
                  <td className="p-5 text-white/80">{log.item}</td>
                  <td className="p-5 text-white/60">{log.date}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      log.status === 'Active' ? 'bg-[#3B82F6]/20 text-[#3B82F6]' :
                      log.status === 'Returned' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {log.status}
                    </span>
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