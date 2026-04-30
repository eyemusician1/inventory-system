import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function GenerateReports() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen w-full bg-[#050B14] text-white p-6 md:p-12 flex flex-col items-center justify-center"
      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace" }}
    >
      <div className="absolute top-10 left-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-100/50 hover:text-white transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="w-full max-w-lg p-10 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Generate Reports</h1>
        <p className="text-blue-100/50 mb-8">Export system data for auditing and review.</p>

        <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm text-blue-100/70 mb-2 uppercase tracking-widest font-semibold">Report Type</label>
            <select
              style={{ fontFamily: 'inherit' }}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30 transition-all appearance-none cursor-pointer"
            >
              <option>Current Inventory Status</option>
              <option>Monthly Borrowing History</option>
              <option>Equipment in Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-blue-100/70 mb-2 uppercase tracking-widest font-semibold">Format</label>
            <select
              style={{ fontFamily: 'inherit' }}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30 transition-all appearance-none cursor-pointer"
            >
              <option>CSV (Spreadsheet)</option>
              <option>PDF Document</option>
            </select>
          </div>

          <button
            type="submit"
            style={{ fontFamily: 'inherit' }}
            className="mt-4 bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 px-6 py-4 rounded-2xl text-lg font-bold tracking-tight transition-all duration-300 w-full"
          >
            Download Report
          </button>
        </form>
      </div>
    </div>
  );
}