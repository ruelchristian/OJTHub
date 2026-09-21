# Mobile-First Responsive PWA Architecture Plan

## 1. Overview & Core Philosophy
This plan outlines the end-to-end responsive redesign of **OJTHub**, establishing a **mobile-first design foundation** that scales seamlessly from ultra-compact smartphones (320px) up to ultra-wide desktop monitors (1440px+).

```
Mobile (320px - 430px) ──> Tablet (768px - 820px) ──> Laptop (1024px) ──> Desktop (1280px - 1440px+)
[Bottom Nav + Cards]     [Expanded Grid + Tables]   [Desktop Nav]       [Maximum Ergonomics]
```

---

## 2. Target Breakpoint Matrix
| Breakpoint Key | Viewport Width | Target Devices | Layout Strategy |
| :--- | :--- | :--- | :--- |
| **xs (mobile small)** | `320px - 374px` | iPhone SE 1st gen, small Androids | Single column, compact padding (12px), stacked controls, card-based tables |
| **sm (mobile standard)** | `375px - 430px` | iPhone 12-16 Pro Max, Pixel, Galaxy | Single column, thumb-friendly 48px touch targets, mobile bottom bar |
| **md (tablet)** | `768px - 820px` | iPad Mini, iPad 10th gen, iPad Air | 2-column metrics, transition from bottom bar to header nav, data grids |
| **lg (laptop)** | `1024px` | iPad Pro, Small laptops, MacBook Air | Full tabular views, multi-column forms + logs split, expanded maps |
| **xl (desktop)** | `1280px` | Standard monitors, 1080p screens | Max-width 7xl container, enhanced spacing, hover interactions |
| **2xl (large desktop)** | `1440px+` | High-res monitors, 2K/4K displays | Centered bounded container, high-density dashboard metrics |

---

## 3. Key Responsive Upgrades by Component

### 3.1 PWA Safe Areas & Global Framework (`index.html`, `index.css`, `App.tsx`)
- **Viewport meta**: Set `viewport-fit=cover` and allow user scaling up to 5x.
- **CSS Environment Variables**: Define `--sat`, `--sab`, `--sal`, `--sar` to dynamically pad notches and bottom home indicators on iOS/Android.
- **Dynamic Viewport Height**: Use `100dvh` to avoid mobile browser navigation bar jumps.
- **Horizontal Overflow Shield**: Strict `overflow-x: hidden` on root and body elements to prevent accidental sideways scroll.
- **Main Container Spacing**: Responsive content padding with `pb-28 md:pb-8` to ensure fixed bottom navigation never obscures page content or footer.

### 3.2 Navigation System (`Navbar.tsx`)
- **Mobile Bottom Navigation**:
  - Minimum 48px touch targets.
  - Safe-area bottom padding (`env(safe-area-inset-bottom)`).
  - Horizontal scrolling or compact flex layout with text scaling for small screens (`320px`).
- **Top Header**:
  - Logo & title responsiveness: Compact on 320px, expanded branding on larger screens.
  - Guest/User badge & Auth buttons: Touch-friendly heights and padding.

### 3.3 Dashboard Console (`Dashboard.tsx`)
- **Geofence Banner**:
  - Fluid stacking of company name, title, and status pill.
  - Calibration controls and GPS refresh button wrap gracefully on mobile.
- **Punch Clock Card**:
  - Fluid stopwatch typography (`clamp(2.5rem, 8vw, 4rem)`).
  - Big action button (Time In / Time Out): Full-width on mobile with 56px height for effortless one-thumb tapping.
  - Status indicators: Flex column on mobile, row on tablet+.
- **Summary Metrics**:
  - 2 columns on mobile, 4 columns on desktop, with fluid numeric font sizes preventing overflow.

### 3.4 Data-Heavy Tables (`AttendanceHistory.tsx`, `DtrGenerator.tsx`)
- **Mobile Experience**: Responsive card view displaying date, times, lunch break, verified geofence badge, and approval status.
- **Desktop Experience**: Rich data table with sortable columns and compact rows.
- **Printable DTR Generator**:
  - Summary metrics adapt to 2x2 grid on mobile.
  - Table maintains clean contained scrolling with mobile visual cue.

### 3.5 Forms & AI Workspace (`ActivityLogger.tsx`, `AiReporting.tsx`, `SettingsView.tsx`)
- **Touch-Friendly Controls**: Form inputs with minimum 44px height and 16px font size to prevent iOS automatic zoom.
- **Grid Adaptation**: Forms and log feeds stack vertically on mobile and switch to 1:2 split on laptops (`lg:grid-cols-3`).
- **AI Workspace**: Segmented buttons and multi-action toolbar flex-wrap with ample touch target spacing.
- **Interactive Map Picker**: Responsive map canvas height (`260px` on mobile, `380px` on desktop) with touch-drag optimizations.

### 3.6 Modals & Dialogs (`SupervisorPortal.tsx`, `AuthModal.tsx`)
- Bottom-sheet styling on mobile viewports (`max-h-[92dvh]`, rounded-t-3xl) adapting to centered floating modal on tablets and desktops.
- Full scroll isolation and touch-friendly close buttons.

---

## 4. Verification & Testing Matrix
We will audit and test each of the required screen widths:
- `320px` (Compact phone)
- `375px` (Standard iPhone)
- `390px` (Modern iPhone)
- `430px` (iPhone Pro Max)
- `768px` (iPad Portrait)
- `820px` (iPad Air Portrait)
- `1024px` (iPad Landscape / Small Laptop)
- `1280px` (Standard Desktop)
- `1440px` (Large Desktop)
