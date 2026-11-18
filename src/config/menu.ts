export interface MenuItem {
  label: string;
  path: string; // react-router path
  subItems?: MenuItem[]; // optional dropdown items
}

export const MENU: MenuItem[] = [
  { label: 'Dashboard', path: '/' },
  {
    label: 'Paper Trading',
    path: '/paper',
    subItems: [
      { label: 'Summary', path: '/paper/summary' },
      { label: 'Orders', path: '/paper/orders' },
      // add more paper‑trading pages as needed
    ],
  },
  {
    label: 'Alert Rules',
    path: '/alerts',
    subItems: [
      { label: 'Daftar', path: '/alerts' },
      { label: 'Tambah', path: '/alerts/new' },
    ],
  },
  // Future features can be added here, e.g.:
  // { label: 'Monte Carlo', path: '/monte-carlo' },
];
