# Inventory System Architecture

## Overview

This is a client-side React application built with Vite. It uses Firebase Authentication for admin access and Cloud Firestore as the main data store for equipment and borrowing records.

The app is split into two user paths:

- Public borrowing flow for students, faculty, and staff.
- Protected admin flow for managing equipment, reviewing logs, and exporting reports.

## High-Level Structure

```text
src/
  main.jsx                 App bootstrap
  App.jsx                  Router and top-level providers
  context/                 Theme and auth state
  components/              Shared route protection
  firebase/                Firebase initialization
  pages/
    admin/                 Admin screens
    public/                Public borrower screen
```

## Runtime Flow

1. `main.jsx` mounts the React app into the root DOM node.
2. `App.jsx` wraps the app with `ThemeProvider`, `AuthProvider`, and `BrowserRouter`.
3. Routes are lazy loaded with `React.lazy` and `Suspense` to keep the initial bundle smaller.
4. Firebase auth state is observed in `AuthContext`.
5. Protected admin routes are guarded by `ProtectedRoute`, which redirects unauthenticated users to `/login`.
6. Admin actions read and write Firestore documents in real time or through one-time fetches depending on the page.

## Frontend Layers

### App Shell

- `src/main.jsx` is the entry point.
- `src/App.jsx` defines routing and global providers.
- `src/index.css` and Tailwind drive the UI styling.

### State and Context

- `ThemeContext` stores dark mode preference in `localStorage`.
- `AuthContext` listens to Firebase auth changes and exposes the current user.

### Route Protection

- `ProtectedRoute` blocks access to admin screens when no Firebase user is present.
- Public borrowing remains accessible through `/borrow/:id`.

### Firebase Layer

- `src/firebase/firebase.config.js` initializes Firebase from Vite environment variables.
- Exports `auth` and `db` for use across the app.

## Core Pages

### Public Flow

- `LandingPage` is the public entry screen.
- `LoginPage` handles admin sign-in.
- `BorrowFormPage` fetches an equipment record by ID and submits a borrow transaction.

### Admin Flow

- `Dashboard` shows summary counts for available, borrowed, total, and maintenance items.
- `AddEquipment` manages inventory creation, updates, deletion, and QR code generation.
- `ReviewBorrowLogs` monitors borrow activity and supports return processing and log deletion.
- `GenerateReports` exports inventory and borrowing data as CSV or printable PDF.

## Data Model

The app currently relies on two Firestore collections:

### `equipment`

Typical fields:

- `name`
- `category`
- `assetTag`
- `status`
- `trackingType`
- `availableQuantity`
- `totalQuantity`
- `dateAdded`

### `logs`

Typical fields:

- `borrowerName`
- `borrowerId`
- `borrowerRole`
- `itemName`
- `equipmentId`
- `quantityBorrowed`
- `dateBorrowedAt`
- `dateBorrowed`
- `expectedReturn`
- `status`
- `dateReturned`

## Behavior Summary

### Borrowing

- The public borrow form reads the selected equipment item by ID.
- For bulk items, a Firestore transaction decrements available quantity safely.
- For individual items, status changes from `available` to `borrowed`.
- Each borrow action writes a log entry to `logs`.

### Inventory Management

- Admins can add equipment in bulk or individual mode.
- QR codes point to `/borrow/:id` so a physical asset can be checked out by scanning.
- Item status can be toggled between available and maintenance.

### Log Review and Returns

- Borrow logs are streamed live with `onSnapshot`.
- Returning an item updates the log and restores equipment availability.
- Deleting logs is supported for cleanup or archival workflows.

### Reporting

- Reports are generated from Firestore reads.
- CSV export is handled in-browser.
- PDF output is implemented through a print-friendly HTML window.

## Deployment

- Firebase Hosting is configured to serve the built `dist` folder.
- Vercel is also configured as a static build target with SPA routing back to `index.html`.
- Environment variables are required for the Firebase config values and optional app URL for QR generation.

## Notes

- The UI is responsive and themed with a persistent dark-mode setting.
- The app relies on Firestore rules and Firebase auth for access control.
- QR-code-driven public borrowing is the key bridge between the physical assets and the digital inventory records.