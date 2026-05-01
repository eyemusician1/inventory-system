import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase.config';
import { useTheme } from '../../context/ThemeContext';

export default function GenerateReports() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [reportType, setReportType] = useState('Current Inventory Status');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const reportRef = useRef(null);
  const reportOptions = ["Current Inventory Status", "Monthly Borrowing History", "Equipment in Maintenance"];

  const [format, setFormat] = useState('CSV (Spreadsheet)');
  const [isFormatOpen, setIsFormatOpen] = useState(false);
  const formatRef = useRef(null);
  const formatOptions = ["CSV (Spreadsheet)", "PDF Document"];

  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reportRef.current && !reportRef.current.contains(event.target)) setIsReportOpen(false);
      if (formatRef.current && !formatRef.current.contains(event.target)) setIsFormatOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- REPORT GENERATION LOGIC ---
  const formatDateValue = (value) => {
    if (value?.toDate) {
      return value.toDate().toLocaleDateString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return 'N/A';
  };

  const formatDateTimeValue = (value) => {
    if (value?.toDate) {
      return value.toDate().toLocaleString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return 'N/A';
  };

  const getSortableDate = (value) => {
    if (value?.toDate) return value.toDate();
    if (typeof value === 'string') return new Date(value);
    return new Date(0);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    showToast("Compiling data...");

    try {
      let headers = [];
      let rows = [];
      let reportTitle = reportType;

      // 1. FETCH & FORMAT DATA BASED ON REPORT TYPE
      if (reportType === "Current Inventory Status") {
        const snap = await getDocs(collection(db, 'equipment'));
        headers = ["Asset Tag", "Equipment Name", "Category", "Status", "Tracking", "Available Qty", "Total Qty"];
        snap.forEach(doc => {
          const data = doc.data();
          rows.push([
            data.assetTag || 'N/A',
            data.name || 'N/A',
            data.category || 'N/A',
            (data.status || 'N/A').toUpperCase(),
            data.trackingType || 'N/A',
            data.availableQuantity ?? (data.status === 'available' ? 1 : 0),
            data.totalQuantity ?? 1
          ]);
        });
      }
      else if (reportType === "Equipment in Maintenance") {
        const snap = await getDocs(collection(db, 'equipment'));
        headers = ["Asset Tag", "Equipment Name", "Category", "Date Added"];
        snap.forEach(doc => {
          const data = doc.data();
          if (data.status === 'maintenance') {
            rows.push([
              data.assetTag || 'N/A',
              data.name || 'N/A',
              data.category || 'N/A',
              formatDateValue(data.dateAdded)
            ]);
          }
        });
        if (rows.length === 0) rows.push(["No equipment currently in maintenance", "", "", ""]);
      }
      else if (reportType === "Monthly Borrowing History") {
        const snap = await getDocs(collection(db, 'logs'));
        headers = ["Date Borrowed", "Borrower", "Role", "Item Name", "Qty", "Status", "Date Returned"];

        // Optional: Filter for current month. Currently fetching all for a complete audit log.
        snap.forEach(doc => {
          const data = doc.data();
          rows.push([
            formatDateTimeValue(data.dateBorrowedAt || data.dateBorrowed),
            data.borrowerName || data.studentName || 'N/A',
            data.borrowerRole || 'N/A',
            data.itemName || 'N/A',
            data.quantityBorrowed || 1,
            (data.status || 'N/A').toUpperCase(),
            data.dateReturned || 'Pending'
          ]);
        });

        // Sort by date borrowed (newest first) if possible
        rows.sort((a, b) => getSortableDate(b[0]) - getSortableDate(a[0]));
      }

      // 2. EXPORT AS CSV
      if (format === "CSV (Spreadsheet)") {
        const csvContent = [
          headers.join(","),
          ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("CSV Downloaded.");
      }

      // 3. EXPORT AS PDF (Via Print Dialog)
      else if (format === "PDF Document") {
        const printWindow = window.open('', '_blank');

        const htmlContent = `
          <html>
            <head>
              <title>${reportTitle}</title>
              <style>
                body { font-family: 'Courier New', Courier, monospace; padding: 40px; color: #1a202c; }
                h1 { text-align: center; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 40px; }
                table { w-full; width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 12px 15px; text-align: left; }
                th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
                tr:nth-child(even) { background-color: #f8fafc; }
                .footer { margin-top: 40px; text-align: right; font-size: 10px; color: #64748b; text-transform: uppercase; }
              </style>
            </head>
            <body>
              <h1>${reportTitle}</h1>
              <table>
                <thead>
                  <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                  ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
              <div class="footer">Generated on: ${new Date().toLocaleString()} | Lab Inventory System</div>
              <script>
                window.onload = function() { window.print(); window.close(); }
              </script>
            </body>
          </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        showToast("PDF Print Dialog Opened.");
      }

    } catch (error) {
      console.error("Report generation error:", error);
      showToast("Error generating report.");
    } finally {
      setIsLoading(false);
    }
  };

  const pageBg     = isDarkMode ? 'bg-[#050B14] text-white'         : 'bg-slate-50 text-slate-900';
  const backBtn    = isDarkMode ? 'text-white/40 hover:text-white'  : 'text-slate-400 hover:text-slate-900';
  const subText    = isDarkMode ? 'text-blue-100/40'                : 'text-slate-400';
  const cardBg     = isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/40';
  const inputBg    = isDarkMode ? 'bg-black/40 border-white/10'     : 'bg-white border-slate-300 text-slate-900';
  const chevron    = isDarkMode ? 'text-white/40'                   : 'text-slate-400';
  const dropdownBg = isDarkMode ? 'bg-black/80 border-white/10'     : 'bg-white border-slate-200 shadow-xl';
  const dropItem   = isDarkMode ? 'text-white/60 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100';
  const dropActive = isDarkMode ? 'text-[#3B82F6] bg-[#3B82F6]/5'  : 'text-[#3852A4] bg-[#3852A4]/5';
  const labelText  = isDarkMode ? 'text-white/30'                   : 'text-slate-400';
  const downloadBtn = isDarkMode ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                                 : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800';
  const footerText = isDarkMode ? 'text-white/20'                   : 'text-slate-300';

  const DropdownChevron = ({ isOpen }) => (
    <svg width="16" height="16" sm:width="20" sm:height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#3852A4]' : chevron}`}>
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );

  return (
    <div
      className={`min-h-screen w-full overflow-y-auto p-4 sm:p-6 md:p-12 lg:p-16 flex flex-col items-center relative transition-colors duration-500 ${pageBg}`}
      style={{ fontFamily: "ui-monospace, monospace" }}
    >
      {/* Toast Notification */}
      <div className={`fixed bottom-4 sm:bottom-10 right-4 sm:right-10 z-[60] transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl backdrop-blur-2xl border shadow-2xl ${isDarkMode ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-900 border-slate-800 text-white'}`}>
          <span className="text-[10px] sm:text-xs font-black tracking-[0.3em] uppercase opacity-80">{toast.message}</span>
        </div>
      </div>

      {/* Back */}
      <button onClick={() => navigate('/dashboard')} className={`self-start text-base sm:text-lg transition-all mb-8 sm:mb-12 flex items-center gap-2 cursor-pointer ${backBtn}`}>
        <span className="text-xl sm:text-2xl">←</span> Back to Dashboard
      </button>

      {/* Header */}
      <div className="w-full max-w-6xl mb-8 sm:mb-12 text-left">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-2 sm:mb-4">Generate Reports</h1>
        <p className={`text-[10px] sm:text-sm font-bold uppercase tracking-widest ${subText}`}>System Auditing & Exports</p>
      </div>

      {/* Config Card */}
      <div className={`w-full max-w-6xl p-6 sm:p-8 md:p-12 backdrop-blur-3xl border rounded-[2rem] sm:rounded-[3rem] shadow-2xl ${cardBg}`}>
        <form className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-end" onSubmit={handleGenerate}>

          {/* Report Type Dropdown */}
          <div className="lg:col-span-5 relative" ref={reportRef}>
            <label className={`text-[9px] sm:text-xs font-bold uppercase tracking-[0.3em] mb-2 sm:mb-4 block ml-2 sm:ml-4 ${labelText}`}>Report Category</label>
            <div
              onClick={() => setIsReportOpen(!isReportOpen)}
              className={`w-full border rounded-2xl sm:rounded-3xl px-4 sm:px-8 py-4 sm:py-6 text-sm sm:text-xl cursor-pointer transition-all flex justify-between items-center ${inputBg} ${isReportOpen ? 'border-[#3852A4] ring-1 ring-[#3852A4]/50' : ''}`}
            >
              <span className="truncate mr-4">{reportType}</span>
              <DropdownChevron isOpen={isReportOpen} />
            </div>
            {isReportOpen && (
              <div className={`absolute top-[calc(100%+8px)] sm:top-[calc(100%+10px)] left-0 w-full backdrop-blur-2xl border rounded-2xl sm:rounded-3xl overflow-hidden z-[80] shadow-2xl ${dropdownBg}`}>
                {reportOptions.map((opt) => (
                  <div key={opt} onClick={() => { setReportType(opt); setIsReportOpen(false); }}
                    className={`px-4 sm:px-8 py-3 sm:py-5 text-sm sm:text-lg cursor-pointer transition-all ${reportType === opt ? `font-bold ${dropActive}` : dropItem}`}>
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Format Dropdown */}
          <div className="lg:col-span-4 relative" ref={formatRef}>
            <label className={`text-[9px] sm:text-xs font-bold uppercase tracking-[0.3em] mb-2 sm:mb-4 block ml-2 sm:ml-4 ${labelText}`}>Export Format</label>
            <div
              onClick={() => setIsFormatOpen(!isFormatOpen)}
              className={`w-full border rounded-2xl sm:rounded-3xl px-4 sm:px-8 py-4 sm:py-6 text-sm sm:text-xl cursor-pointer transition-all flex justify-between items-center ${inputBg} ${isFormatOpen ? 'border-[#3852A4] ring-1 ring-[#3852A4]/50' : ''}`}
            >
              <span className="truncate mr-4">{format}</span>
              <DropdownChevron isOpen={isFormatOpen} />
            </div>
            {isFormatOpen && (
              <div className={`absolute top-[calc(100%+8px)] sm:top-[calc(100%+10px)] left-0 w-full backdrop-blur-2xl border rounded-2xl sm:rounded-3xl overflow-hidden z-[80] shadow-2xl ${dropdownBg}`}>
                {formatOptions.map((opt) => (
                  <div key={opt} onClick={() => { setFormat(opt); setIsFormatOpen(false); }}
                    className={`px-4 sm:px-8 py-3 sm:py-5 text-sm sm:text-lg cursor-pointer transition-all ${format === opt ? `font-bold ${dropActive}` : dropItem}`}>
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Download Button */}
          <div className="lg:col-span-3">
            <button type="submit" disabled={isLoading}
              className={`w-full backdrop-blur-md border py-4 sm:py-6 rounded-2xl sm:rounded-3xl font-bold text-base sm:text-xl transition-all shadow-lg active:scale-95 cursor-pointer ${downloadBtn} ${isLoading ? 'opacity-50' : ''}`}>
              {isLoading ? "Generating..." : "Download"}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-12 pb-6">
        <p className={`text-[9px] sm:text-xs font-bold uppercase tracking-[0.4em] text-center ${footerText}`}>
          End of Session Audits Available
        </p>
      </div>
    </div>
  );
}