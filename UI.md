# Modernisierung des **evAlarm Gateway**‑Frontends

> **Ziel**: Ohne Wechsel des bestehenden React‑/Bootstrap‑Stacks eine UI schaffen, die sich an modernen Server‑Management‑Konsolen (z. B. Portainer, Cockpit, Netdata) orientiert – klar, schnell, keyboard‑freundlich und CI‑konform. Dieses Dokument beschreibt Informations‑Architektur, UX‑Patterns, technische Bausteine und einen möglichen Migrations‑Fahrplan, damit das Team die Umsetzung inkrementell planen kann.

---

## 1 · Scope & Leitplanken

| **Beibehalten**              | **Erweitern/Ersetzen**                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 17+, React‑Bootstrap 2 | ‑ Permanente Side‑Nav<br>‑ Drawer statt Modals<br>‑ TanStack Table (Headless)<br>‑ Command Palette (⌘ K)<br>‑ Toast‑Notifications (react‑toastify) |
| Build‑Pipeline (Vite)        | CSS‑Variablen + Sass‑Overrides für Bootstrap Token                                                                                                 |
| Routing (react‑router v6)    | URL‑basierte Detail‑Drawer (`/gateways/:id`)                                                                                                       |
| REST‑/WebSocket‑APIs         | keine Änderungen                                                                                                                                   |

---

## 2 · Informations‑Architektur & Navigation

### 2.1 Neue Menü‑Struktur

```js
// menu.ts
export const menu = [
  { label: 'Dashboard', icon: 'layout-dashboard', to: '/' },
  {
    label: 'Betrieb',
    items: [
      { label: 'Live‑Status', icon: 'activity', to: '/status' },
      { label: 'Logs',       icon: 'terminal', to: '/logs'   }
    ]
  },
  {
    label: 'Objekte',
    items: [
      { label: 'Kunden',   icon: 'building', to: '/customers' },
      { label: 'Gateways', icon: 'router',   to: '/gateways'  },
      { label: 'Geräte',   icon: 'cpu',      to: '/devices'   }
    ]
  },
  { label: 'Nachrichten', icon: 'inbox',     to: '/messages' },
  { label: 'Templates',   icon: 'file-code', to: '/templates' }
];
```

* **Side‑Nav**: 240 px, dauerhaft offen ≥ lg, als `<Offcanvas>` einklappbar < lg.
* **Top‑Bar** nur noch Logo + User‑Menu + Command Palette.

### 2.2 Navigations‑Pattern

* **Bread‑crumbs**: `Objekte / Gateways / gw‑c490…`
* **Detail‑Drawer**: rechte Slide‑In‑Pane (400 px) statt Modal, URL enthält ID → Deep‑Linking möglich.
* **Quick‑Search**: globales Overlay (`⌘ K`) mit Fuzzy‑Suche über Routen & Objekte (fuse.js).

---

## 3 · UX‑Patterns & Interaction

| Pattern                 | Beschreibung                                                                            | Aufwand   |                   |          |
| ----------------------- | --------------------------------------------------------------------------------------- | --------- | ----------------- | -------- |
| **Command Palette**     | `react-hotkeys-hook` für Shortcut, Overlay listet Routen + Objekte, On‑Enter navigieren | 1 Tag     |                   |          |
| **Drawer statt Modal**  | `<Offcanvas placement="end">` + CSS‑Transition                                          | 1 Tag     |                   |          |
| **Context‑Menu**        | Drei‑Punkte‑Dropdown pro Row (Edit, Delete, Retry)                                      | 0.5 Tage  |                   |          |
| **Inline‑Tabs**         | Für Nachrichtenseite – *Stream*                                                        | Fehler    | Weiterleitungen*   | 0.5 Tage |
| **Toast‑Notifications** | `react-toastify` global im `AppShell`                                                   | 0.25 Tage |                   |          |
| **Skeleton Loader**     | Platzhalter für Tabellen/Card‑Ladezustand                                               | 0.5 Tage  |                   |          |

---

## 4 · Komponenten‑Austausch

| Alt                 | Neu                                      | Benefit                                           |
| ------------------- | ---------------------------------------- | ------------------------------------------------- |
| `<Table>` Bootstrap | **TanStack Table** (Headless)            | Sticky Header, Virtual Scrolling, Sort/Filter API |
| `<Modal>`           | **Offcanvas/Drawer**                     | Größere Fläche, URL‑State                         |
| Eigene Badge‑Styles | `react-bootstrap/Badge` + Status‑Mapping | Einheitlicher Look                                |

```ts
// statusBadge.tsx
export const StatusBadge = ({ state }: {state:'online'|'offline'|'error'}) => {
  const map = { online:'success', offline:'secondary', error:'danger' } as const;
  return <Badge bg={map[state]}>{state}</Badge>;
};
```

---

## 5 · Layout‑Snippets

### 5.1 AppShell

```tsx
function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <Navbar bg="dark" variant="dark" fixed="top" className="px-3">
        <Navbar.Brand>evAlarm Gateway</Navbar.Brand>
        <Nav className="ms-auto">
          <CommandPalette />
          <NavDropdown title={<IconUser size={18}/>} align="end">
            <NavDropdown.Item onClick={logout}>Logout</NavDropdown.Item>
          </NavDropdown>
        </Nav>
      </Navbar>

      <div className="d-flex">
        <SideNav collapsed={collapsed} />
        <main className="flex-grow-1 p-4 pt-5">
          <Outlet />
        </main>
      </div>
    </>
  );
}
```

### 5.2 Drawer

```tsx
export const Drawer = ({ show, onHide, children }) => (
  <Offcanvas show={show} onHide={onHide} placement="end" backdrop={false} scroll={true}>
    <Offcanvas.Header closeButton />
    <Offcanvas.Body className="py-4 px-4">{children}</Offcanvas.Body>
  </Offcanvas>
);
```

### 5.3 Erweiterter Drawer mit Resize-Funktionalität

```tsx
// DrawerContext.jsx
export const DrawerContext = createContext();

export const DrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(480); // Default drawer width
  
  return (
    <DrawerContext.Provider value={{ isOpen, setIsOpen, width, setWidth }}>
      {children}
    </DrawerContext.Provider>
  );
};

// ResizableDrawer.jsx
const ResizableDrawer = ({ children, title, onClose }) => {
  const { isOpen, width, setWidth } = useContext(DrawerContext);
  const [isResizing, setIsResizing] = useState(false);
  
  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  }, []);
  
  const handleMouseMove = useCallback((e) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < 800) {
        setWidth(newWidth);
        document.documentElement.style.setProperty('--drawer-width', `${newWidth}px`);
      }
    }
  }, [isResizing, setWidth]);
  
  const stopResizing = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  }, [handleMouseMove]);
  
  return (
    <div 
      className={`drawer ${isOpen ? 'open' : ''}`} 
      style={{ width: `${width}px` }}
    >
      <div 
        className="drawer-resize-handle"
        onMouseDown={startResizing}
      />
      <div className="drawer-header">
        <h5>{title}</h5>
        <button className="btn-close" onClick={onClose} />
      </div>
      <div className="drawer-body">
        {children}
      </div>
    </div>
  );
};
```

```css
/* drawer.css */
:root {
  --drawer-width: 480px;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--drawer-width);
  background: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1050;
}

.drawer.open {
  transform: translateX(0);
}

.drawer-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  background: transparent;
}

.drawer-resize-handle:hover,
.drawer-resize-handle:active {
  background: rgba(0, 0, 0, 0.1);
}

/* Adjust main content when drawer is open */
.content-wrapper {
  transition: margin-right 0.3s ease;
}

.content-wrapper.drawer-open {
  margin-right: var(--drawer-width);
}

@media (max-width: 768px) {
  .content-wrapper.drawer-open {
    margin-right: 0; /* Don't adjust content on mobile */
  }
}
```

---

## 6 · Styling‑Guidelines

1. **Farben (CSS‑Vars)**

   ```css
   :root {
     --color-primary: #E02424; /* Signalrot */
     --color-dark:    #1E1E1E;
     --color-gray-100:#F5F5F5;
   }
   ```
2. **Typo**

   * *Inter* – H1 32 px / 700, H2 24 px / 600, Body 14 px / 400
3. **Spacing**

   * Bootstrap‑Radii auf `0.5rem`, Standard‑Gap `1rem` (=16 px)
4. **Icon‑Set**

   * `lucide-react` outline‑Style, Größe 18 px
5. **Dark‑Mode**

   * Body‑Klasse `theme-dark` → überschreibt Hintergrund/Text.

---

## 7 · Migrations‑Roadmap (6 Sprints)

| Sprint | Deliverable                        | Owner   |
| ------ | ---------------------------------- | ------- |
| 1      | Side‑Nav + Top‑Bar Refactor        | FE Team |
| 2      | Drawer‑Pattern für *Gateways*      | FE Team |
| 3      | TanStack Table in allen Listen     | FE Team |
| 4      | Command Palette + Toasts           | FE Team |
| 5      | Nachrichten‑Refactor (Tabs, Retry) | FE + BE |
| 6      | Dark‑Mode, QA, Docs                | QA      |

> **Tip**: Feature‑Flags pro Sprint (z. B. `REACT_APP_ENABLE_DRAWER`) erleichtern Roll‑backs.

---

## 8 · Technologie‑Stack

* **React 17+ / TypeScript**
* **React‑Bootstrap >= 2.10** (Bootstrap v5.3)
* **TanStack Table v8** – headless
* **react-toastify** für globale Toaster
* **react-hotkeys-hook** + **fuse.js** für Command Palette
* **lucide‑react** Icons

---


