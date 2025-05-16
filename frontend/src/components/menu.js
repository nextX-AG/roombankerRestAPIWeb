// Menü-Struktur für die Seitennavigation
// Basierend auf dem Layout aus UI.md
import {
  LayoutDashboard,
  Activity,
  Terminal,
  Building,
  Router,
  Cpu,
  Inbox,
  FileCode
} from 'lucide-react';

export const menu = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  {
    label: 'Betrieb',
    items: [
      { label: 'Live-Status', icon: Activity, to: '/status' },
      { label: 'Logs', icon: Terminal, to: '/debugger' }
    ]
  },
  {
    label: 'Objekte',
    items: [
      { label: 'Kunden', icon: Building, to: '/customers' },
      { label: 'Gateways', icon: Router, to: '/gateways' },
      { label: 'Geräte', icon: Cpu, to: '/devices' }
    ]
  },
  { label: 'Nachrichten', icon: Inbox, to: '/messages' },
  { label: 'Templates', icon: FileCode, to: '/templates' }
];

export default menu; 