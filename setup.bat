@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Lab Inventory System - Project Setup
echo ============================================
echo.

:: ── 1. Check Node.js ──────────────────────────────────────────────────────────
echo [1/8] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Please download and install Node.js from https://nodejs.org/
    echo         Recommended: Node.js v18 LTS or higher
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo [OK] Node.js %NODE_VERSION% found.
echo.

:: ── 2. Check npm ──────────────────────────────────────────────────────────────
echo [2/8] Checking npm...
:: FIXED: Added 'call' here so the script doesn't exit after running npm.cmd
call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found. It should come bundled with Node.js.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm --version') do set NPM_VERSION=%%v
echo [OK] npm v%NPM_VERSION% found.
echo.

:: ── 3. Install Firebase CLI globally ──────────────────────────────────────────
echo [3/8] Installing Firebase CLI globally...
call npm install -g firebase-tools
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Firebase CLI.
    pause
    exit /b 1
)
echo [OK] Firebase CLI installed.
echo.

:: ── 4. Scaffold Vite + React project ──────────────────────────────────────────
echo [4/8] Scaffolding Vite + React project...
set /p PROJECT_NAME="Enter your project folder name (e.g. lab-inventory): "
if "%PROJECT_NAME%"=="" set PROJECT_NAME=lab-inventory

call npm create vite@latest %PROJECT_NAME% -- --template react
if %errorlevel% neq 0 (
    echo [ERROR] Failed to scaffold Vite project.
    pause
    exit /b 1
)
echo [OK] Vite project created in ./%PROJECT_NAME%
echo.

:: ── 5. Install project dependencies ───────────────────────────────────────────
echo [5/8] Installing project dependencies...
cd %PROJECT_NAME%

call npm install ^
    firebase ^
    react-router-dom ^
    qrcode ^
    qrcode.react ^
    react-qr-reader ^
    date-fns ^
    zustand

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install core dependencies.
    pause
    exit /b 1
)

call npm install -D ^
    vite-plugin-pwa ^
    @vitejs/plugin-react ^
    tailwindcss ^
    @tailwindcss/vite

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dev dependencies.
    pause
    exit /b 1
)

echo [OK] All dependencies installed.
echo.

:: ── 6. Initialize Tailwind CSS ────────────────────────────────────────────────
echo [6/8] Initializing Tailwind CSS...
call npx tailwindcss init -p
if %errorlevel% neq 0 (
    echo [WARN] Tailwind init may have failed. Run 'npx tailwindcss init -p' manually.
) else (
    echo [OK] Tailwind CSS initialized.
)
echo.

:: ── 7. Generate Folder Structure + Placeholder Files ──────────────────────────
echo [7/8] Generating folder structure and placeholder files...

:: Remove Vite boilerplate we dont need
del /q src\assets\react.svg >nul 2>&1
del /q public\vite.svg >nul 2>&1
del /q src\App.css >nul 2>&1
del /q src\index.css >nul 2>&1

:: ── Create all directories ──
mkdir src\pages\admin
mkdir src\pages\borrower
mkdir src\components\common
mkdir src\components\dashboard
mkdir src\components\equipment
mkdir src\components\qr
mkdir src\firebase
mkdir src\hooks
mkdir src\store
mkdir src\utils
mkdir src\styles

:: ════════════════════════════════════════════════════
::  FIREBASE
:: ════════════════════════════════════════════════════

> src\firebase\config.js (
    echo // src/firebase/config.js
    echo // Initialize Firebase app and export service instances
    echo import { initializeApp } from 'firebase/app';
    echo import { getAuth } from 'firebase/auth';
    echo import { getFirestore } from 'firebase/firestore';
    echo.
    echo const firebaseConfig = {
    echo   apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    echo   authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    echo   projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    echo   storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    echo   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    echo   appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    echo };
    echo.
    echo const app  = initializeApp^(firebaseConfig^);
    echo export const auth = getAuth^(app^);
    echo export const db   = getFirestore^(app^);
)

> src\firebase\collections.js (
    echo // src/firebase/collections.js
    echo // Centralized Firestore collection name constants
    echo export const COLLECTIONS = {
    echo   EQUIPMENT:      'equipment',
    echo   BORROW_RECORDS: 'borrow_records',
    echo   USERS:          'users',
    echo };
)

:: ════════════════════════════════════════════════════
::  ADMIN PAGES
:: ════════════════════════════════════════════════════

> src\pages\admin\LoginPage.jsx (
    echo // src/pages/admin/LoginPage.jsx
    echo // Staff login — Firebase Auth ^(email/password or Google SSO^)
    echo export default function LoginPage^(^) {
    echo   return ^<div^>LoginPage placeholder^</div^>;
    echo }
)

> src\pages\admin\DashboardPage.jsx (
    echo // src/pages/admin/DashboardPage.jsx
    echo // Main staff dashboard — real-time equipment overview + stats
    echo export default function DashboardPage^(^) {
    echo   return ^<div^>DashboardPage placeholder^</div^>;
    echo }
)

> src\pages\admin\EquipmentPage.jsx (
    echo // src/pages/admin/EquipmentPage.jsx
    echo // Manage equipment — add, edit, archive items; generate QR codes
    echo export default function EquipmentPage^(^) {
    echo   return ^<div^>EquipmentPage placeholder^</div^>;
    echo }
)

> src\pages\admin\BorrowLogsPage.jsx (
    echo // src/pages/admin/BorrowLogsPage.jsx
    echo // Full audit log of all borrow and return transactions
    echo export default function BorrowLogsPage^(^) {
    echo   return ^<div^>BorrowLogsPage placeholder^</div^>;
    echo }
)

> src\pages\admin\ReportsPage.jsx (
    echo // src/pages/admin/ReportsPage.jsx
    echo // Usage reports — filter by date range, item, or borrower
    echo export default function ReportsPage^(^) {
    echo   return ^<div^>ReportsPage placeholder^</div^>;
    echo }
)

:: ════════════════════════════════════════════════════
::  BORROWER PAGES
:: ════════════════════════════════════════════════════

> src\pages\borrower\ScanLandingPage.jsx (
    echo // src/pages/borrower/ScanLandingPage.jsx
    echo // Public page opened when a borrower scans a QR code.
    echo // Checks Firestore: if available show BorrowForm, if borrowed show ReturnConfirm.
    echo export default function ScanLandingPage^(^) {
    echo   return ^<div^>ScanLandingPage placeholder^</div^>;
    echo }
)

> src\pages\borrower\BorrowFormPage.jsx (
    echo // src/pages/borrower/BorrowFormPage.jsx
    echo // Borrower fills in name, ID number, and purpose before confirming borrow
    echo export default function BorrowFormPage^(^) {
    echo   return ^<div^>BorrowFormPage placeholder^</div^>;
    echo }
)

> src\pages\borrower\ReturnConfirmPage.jsx (
    echo // src/pages/borrower/ReturnConfirmPage.jsx
    echo // Shown when borrower scans QR of an item they currently have — confirms return
    echo export default function ReturnConfirmPage^(^) {
    echo   return ^<div^>ReturnConfirmPage placeholder^</div^>;
    echo }
)

> src\pages\borrower\ThankYouPage.jsx (
    echo // src/pages/borrower/ThankYouPage.jsx
    echo // Success screen after a completed borrow or return action
    echo export default function ThankYouPage^(^) {
    echo   return ^<div^>ThankYouPage placeholder^</div^>;
    echo }
)

:: ════════════════════════════════════════════════════
::  COMMON COMPONENTS
:: ════════════════════════════════════════════════════

> src\components\common\Navbar.jsx (
    echo // src/components/common/Navbar.jsx
    echo // Top navigation bar for the admin portal
    echo export default function Navbar^(^) {
    echo   return ^<nav^>Navbar placeholder^</nav^>;
    echo }
)

> src\components\common\Sidebar.jsx (
    echo // src/components/common/Sidebar.jsx
    echo // Collapsible sidebar for admin navigation links
    echo export default function Sidebar^(^) {
    echo   return ^<aside^>Sidebar placeholder^</aside^>;
    echo }
)

> src\components\common\ProtectedRoute.jsx (
    echo // src/components/common/ProtectedRoute.jsx
    echo // Wraps admin routes — redirects unauthenticated users to /login
    echo import { Navigate, Outlet } from 'react-router-dom';
    echo import { useAuth } from '../../hooks/useAuth';
    echo.
    echo export default function ProtectedRoute^(^) {
    echo   const { user, loading } = useAuth^(^);
    echo   if ^(loading^) return null;
    echo   return user ? ^<Outlet /^> : ^<Navigate to="/login" replace /^>;
    echo }
)

> src\components\common\LoadingSpinner.jsx (
    echo // src/components/common/LoadingSpinner.jsx
    echo // Reusable loading indicator for async operations
    echo export default function LoadingSpinner^(^) {
    echo   return ^<div className="flex items-center justify-center p-8"^>Loading...^</div^>;
    echo }
)

> src\components\common\StatusBadge.jsx (
    echo // src/components/common/StatusBadge.jsx
    echo // Pill badge — displays equipment status: available, borrowed, maintenance
    echo export default function StatusBadge^(^) {
    echo   return ^<span^>StatusBadge placeholder^</span^>;
    echo }
)

:: ════════════════════════════════════════════════════
::  DASHBOARD COMPONENTS
:: ════════════════════════════════════════════════════

> src\components\dashboard\StatsCard.jsx (
    echo // src/components/dashboard/StatsCard.jsx
    echo // Summary card showing a single metric e.g. total items, active borrows
    echo export default function StatsCard^(^) {
    echo   return ^<div^>StatsCard placeholder^</div^>;
    echo }
)

> src\components\dashboard\RecentActivityFeed.jsx (
    echo // src/components/dashboard/RecentActivityFeed.jsx
    echo // Real-time feed of the latest borrow and return events
    echo export default function RecentActivityFeed^(^) {
    echo   return ^<div^>RecentActivityFeed placeholder^</div^>;
    echo }
)

> src\components\dashboard\OverdueAlert.jsx (
    echo // src/components/dashboard/OverdueAlert.jsx
    echo // Banner or list highlighting currently overdue borrowed items
    echo export default function OverdueAlert^(^) {
    echo   return ^<div^>OverdueAlert placeholder^</div^>;
    echo }
)

:: ════════════════════════════════════════════════════
::  EQUIPMENT COMPONENTS
:: ════════════════════════════════════════════════════

> src\components\equipment\EquipmentCard.jsx (
    echo // src/components/equipment/EquipmentCard.jsx
    echo // Card view for a single equipment item — shows status and quick actions
    echo export default function EquipmentCard^(^) {
    echo   return ^<div^>EquipmentCard placeholder^</div^>;
    echo }
)

> src\components\equipment\EquipmentTable.jsx (
    echo // src/components/equipment/EquipmentTable.jsx
    echo // Table view listing all equipment with sorting and filtering support
    echo export default function EquipmentTable^(^) {
    echo   return ^<div^>EquipmentTable placeholder^</div^>;
    echo }
)

> src\components\equipment\AddEquipmentModal.jsx (
    echo // src/components/equipment/AddEquipmentModal.jsx
    echo // Modal form for adding a new equipment item to the inventory
    echo export default function AddEquipmentModal^(^) {
    echo   return ^<div^>AddEquipmentModal placeholder^</div^>;
    echo }
)

> src\components\equipment\EditEquipmentModal.jsx (
    echo // src/components/equipment/EditEquipmentModal.jsx
    echo // Modal form for editing details of an existing equipment item
    echo export default function EditEquipmentModal^(^) {
    echo   return ^<div^>EditEquipmentModal placeholder^</div^>;
    echo }
)

:: ════════════════════════════════════════════════════
::  QR COMPONENTS
:: ════════════════════════════════════════════════════

> src\components\qr\QRCodeDisplay.jsx (
    echo // src/components/qr/QRCodeDisplay.jsx
    echo // Renders the QR code image for a given equipment item using qrcode.react
    echo export default function QRCodeDisplay^(^) {
    echo   return ^<div^>QRCodeDisplay placeholder^</div^>;
    echo }
)

> src\components\qr\QRPrintSheet.jsx (
    echo // src/components/qr/QRPrintSheet.jsx
    echo // Print-friendly layout for one or multiple QR codes — used for physical labeling
    echo export default function QRPrintSheet^(^) {
    echo   return ^<div^>QRPrintSheet placeholder^</div^>;
    echo }
)

:: ════════════════════════════════════════════════════
::  HOOKS
:: ════════════════════════════════════════════════════

> src\hooks\useAuth.js (
    echo // src/hooks/useAuth.js
    echo // Exposes current Firebase auth user and loading state via onAuthStateChanged
    echo import { useEffect, useState } from 'react';
    echo import { onAuthStateChanged } from 'firebase/auth';
    echo import { auth } from '../firebase/config';
    echo.
    echo export function useAuth^(^) {
    echo   const [user, setUser]       = useState^(null^);
    echo   const [loading, setLoading] = useState^(true^);
    echo.
    echo   useEffect^(^(^) =^> {
    echo     const unsub = onAuthStateChanged^(auth, ^(u^) =^> {
    echo       setUser^(u^);
    echo       setLoading^(false^);
    echo     }^);
    echo     return unsub;
    echo   }, []^);
    echo.
    echo   return { user, loading };
    echo }
)

> src\hooks\useEquipment.js (
    echo // src/hooks/useEquipment.js
    echo // Real-time Firestore listener for the equipment collection
    echo export function useEquipment^(^) {
    echo   // TODO: implement onSnapshot listener
    echo   return { equipment: [], loading: true };
    echo }
)

> src\hooks\useBorrowRecords.js (
    echo // src/hooks/useBorrowRecords.js
    echo // Fetch and listen to borrow records, optionally filtered by equipmentId
    echo export function useBorrowRecords^(equipmentId^) {
    echo   // TODO: implement onSnapshot listener with optional filter
    echo   return { records: [], loading: true };
    echo }
)

:: ════════════════════════════════════════════════════
::  STORE
:: ════════════════════════════════════════════════════

> src\store\inventoryStore.js (
    echo // src/store/inventoryStore.js
    echo // Zustand global store — shared UI state for the admin portal
    echo import { create } from 'zustand';
    echo.
    echo export const useInventoryStore = create^(^(set^) =^> ^({
    echo   selectedEquipment: null,
    echo   setSelectedEquipment: ^(item^) =^> set^(^{ selectedEquipment: item }^),
    echo.
    echo   // 'all' ^| 'available' ^| 'borrowed' ^| 'maintenance'
    echo   filterStatus: 'all',
    echo   setFilterStatus: ^(status^) =^> set^(^{ filterStatus: status }^),
    echo }^)^);
)

:: ════════════════════════════════════════════════════
::  UTILS
:: ════════════════════════════════════════════════════

> src\utils\qrHelpers.js (
    echo // src/utils/qrHelpers.js
    echo // Helpers for building QR scan URLs and triggering QR image downloads
    echo export function buildQRUrl^(equipmentId^) {
    echo   const base = import.meta.env.VITE_APP_BASE_URL;
    echo   return `${base}/scan/${equipmentId}`;
    echo }
)

> src\utils\formatters.js (
    echo // src/utils/formatters.js
    echo // Date and text formatting utilities shared across the app
    echo import { format, formatDistanceToNow } from 'date-fns';
    echo.
    echo export const formatDate = ^(ts^) =^> format^(ts.toDate^(^), 'MMM dd, yyyy hh:mm a'^);
    echo export const timeAgo    = ^(ts^) =^> formatDistanceToNow^(ts.toDate^(^), { addSuffix: true }^);
)

> src\utils\constants.js (
    echo // src/utils/constants.js
    echo // App-wide enums and constant values
    echo export const EQUIPMENT_STATUS = {
    echo   AVAILABLE:   'available',
    echo   BORROWED:    'borrowed',
    echo   MAINTENANCE: 'maintenance',
    echo };
    echo.
    echo export const EQUIPMENT_CATEGORY = {
    echo   BORROWABLE: 'borrowable',  // projectors, cables — each gets a unique QR code
    echo   COUNTABLE:  'countable',   // PCs, chairs — quantity tracked manually by staff
    echo };
)

:: ════════════════════════════════════════════════════
::  STYLES
:: ════════════════════════════════════════════════════

> src\styles\index.css (
    echo /* src/styles/index.css */
    echo @tailwind base;
    echo @tailwind components;
    echo @tailwind utilities;
)

:: ════════════════════════════════════════════════════
::  APP.JSX  ^(router^)
:: ════════════════════════════════════════════════════

> src\App.jsx (
    echo // src/App.jsx
    echo // Root component — defines all application routes
    echo import { BrowserRouter, Routes, Route } from 'react-router-dom';
    echo import LoginPage         from './pages/admin/LoginPage';
    echo import DashboardPage     from './pages/admin/DashboardPage';
    echo import EquipmentPage     from './pages/admin/EquipmentPage';
    echo import BorrowLogsPage    from './pages/admin/BorrowLogsPage';
    echo import ReportsPage       from './pages/admin/ReportsPage';
    echo import ScanLandingPage   from './pages/borrower/ScanLandingPage';
    echo import BorrowFormPage    from './pages/borrower/BorrowFormPage';
    echo import ReturnConfirmPage from './pages/borrower/ReturnConfirmPage';
    echo import ThankYouPage      from './pages/borrower/ThankYouPage';
    echo import ProtectedRoute    from './components/common/ProtectedRoute';
    echo.
    echo export default function App^(^) {
    echo   return ^(
    echo     ^<BrowserRouter^>
    echo       ^<Routes^>
    echo         ^<Route path="/scan/:equipmentId"   element={^<ScanLandingPage /^>} /^>
    echo         ^<Route path="/borrow/:equipmentId" element={^<BorrowFormPage /^>} /^>
    echo         ^<Route path="/return/:equipmentId" element={^<ReturnConfirmPage /^>} /^>
    echo         ^<Route path="/thankyou"            element={^<ThankYouPage /^>} /^>
    echo         ^<Route path="/login"               element={^<LoginPage /^>} /^>
    echo         ^<Route element={^<ProtectedRoute /^>}^>
    echo           ^<Route path="/"          element={^<DashboardPage /^>} /^>
    echo           ^<Route path="/equipment" element={^<EquipmentPage /^>} /^>
    echo           ^<Route path="/logs"      element={^<BorrowLogsPage /^>} /^>
    echo           ^<Route path="/reports"   element={^<ReportsPage /^>} /^>
    echo         ^</Route^>
    echo       ^</Routes^>
    echo     ^</BrowserRouter^>
    echo   ^);
    echo }
)

:: ════════════════════════════════════════════════════
::  ENV FILES
:: ════════════════════════════════════════════════════

> .env (
    echo # .env
    echo # IMPORTANT: Do not commit this file — it contains your secret Firebase credentials
    echo.
    echo VITE_FIREBASE_API_KEY=your_api_key_here
    echo VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    echo VITE_FIREBASE_PROJECT_ID=your_project_id
    echo VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    echo VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    echo VITE_FIREBASE_APP_ID=your_app_id
    echo.
    echo # Base URL for generating QR scan links
    echo VITE_APP_BASE_URL=http://localhost:5173
)

> .env.development (
    echo # .env.development
    echo # Loaded automatically by Vite in dev mode  ^(npm run dev^)
    echo VITE_APP_BASE_URL=http://localhost:5173
)

> .env.production (
    echo # .env.production
    echo # Loaded automatically by Vite during build  ^(npm run build^)
    echo # Replace with your actual Firebase Hosting URL or custom domain
    echo VITE_APP_BASE_URL=https://your-project.web.app
)

> .env.example (
    echo # .env.example
    echo # Safe to commit — copy this to .env and fill in your values
    echo # Get credentials from: Firebase Console ^> Project Settings ^> Your Apps
    echo.
    echo VITE_FIREBASE_API_KEY=
    echo VITE_FIREBASE_AUTH_DOMAIN=
    echo VITE_FIREBASE_PROJECT_ID=
    echo VITE_FIREBASE_STORAGE_BUCKET=
    echo VITE_FIREBASE_MESSAGING_SENDER_ID=
    echo VITE_FIREBASE_APP_ID=
    echo VITE_APP_BASE_URL=
)

:: Append env ignores to .gitignore
echo. >> .gitignore
echo # Environment files >> .gitignore
echo .env >> .gitignore
echo .env.development >> .gitignore
echo .env.production >> .gitignore

echo [OK] Folder structure and all placeholder files created.
echo.

:: ── 8. Firebase login + init ──────────────────────────────────────────────────
echo [8/8] Logging into Firebase and initializing project...
echo.
echo You will be prompted to log into your Google account.
call firebase login
if %errorlevel% neq 0 (
    echo [WARN] Firebase login skipped or failed. Run 'firebase login' manually later.
)

echo.
echo Initializing Firebase ^(select Firestore + Hosting when prompted^)...
echo Set public directory to: dist
call firebase init
if %errorlevel% neq 0 (
    echo [WARN] Firebase init skipped. Run 'firebase init' manually inside the project folder.
)

:: ── Done ──────────────────────────────────────────────────────────────────────
echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo   Project structure:
echo.
echo   src/
echo   ^|-- pages/
echo   ^|   ^|-- admin/       LoginPage, DashboardPage, EquipmentPage,
echo   ^|   ^|                 BorrowLogsPage, ReportsPage
echo   ^|   ^`-- borrower/    ScanLandingPage, BorrowFormPage,
echo   ^|                     ReturnConfirmPage, ThankYouPage
echo   ^|-- components/
echo   ^|   ^|-- common/      Navbar, Sidebar, ProtectedRoute,
echo   ^|   ^|                 LoadingSpinner, StatusBadge
echo   ^|   ^|-- dashboard/   StatsCard, RecentActivityFeed, OverdueAlert
echo   ^|   ^|-- equipment/   EquipmentCard, EquipmentTable,
echo   ^|   ^|                 AddEquipmentModal, EditEquipmentModal
echo   ^|   ^`-- qr/          QRCodeDisplay, QRPrintSheet
echo   ^|-- firebase/        config.js, collections.js
echo   ^|-- hooks/           useAuth.js, useEquipment.js, useBorrowRecords.js
echo   ^|-- store/           inventoryStore.js
echo   ^|-- utils/           qrHelpers.js, formatters.js, constants.js
echo   ^|-- styles/          index.css
echo   ^`-- App.jsx
echo.
echo   Environment files:
echo   .env               ^<-- fill in your Firebase values here
echo   .env.development   ^<-- dev overrides
echo   .env.production    ^<-- production overrides
echo   .env.example       ^<-- safe to commit to git
echo.
echo   Next steps:
echo   1. Open .env and paste your Firebase credentials
echo      ^(Firebase Console ^> Project Settings ^> Your Apps^)
echo   2. Run:  npm run dev
echo   3. Deploy:  npm run build ^&^& firebase deploy
echo.
pause