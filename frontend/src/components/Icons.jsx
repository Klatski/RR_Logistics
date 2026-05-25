export function Icon({ name, size = 20, ...rest }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest,
  };
  switch (name) {
    case 'user':
      return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>;
    case 'lock':
      return <svg {...props}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></svg>;
    case 'eye':
      return <svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'eye-off':
      return <svg {...props}><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.4 6.4A17 17 0 0 0 2 13s3.5 7 10 7c1.5 0 2.9-.3 4.1-.7"/></svg>;
    case 'car':
      return <svg {...props}><path d="M4 17v-4l2-5a2 2 0 0 1 2-1.5h8a2 2 0 0 1 2 1.5l2 5v4"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/></svg>;
    case 'clock':
      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'logout':
      return <svg {...props}><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/></svg>;
    case 'camera':
      return <svg {...props}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>;
    case 'back':
      return <svg {...props}><path d="M15 6l-6 6 6 6"/></svg>;
    case 'x':
      return <svg {...props}><path d="M6 6l12 12M6 18L18 6"/></svg>;
    case 'check':
      return <svg {...props}><path d="M5 12l5 5 9-11"/></svg>;
    case 'cloud-up':
      return <svg {...props}><path d="M17 18a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1A4 4 0 0 0 6 19h11z"/><path d="M12 13v6M9 16l3-3 3 3"/></svg>;
    case 'wifi-off':
      return <svg {...props}><path d="M3 3l18 18"/><path d="M9 17.5a3 3 0 0 1 4-.3"/><path d="M5 12.5a8 8 0 0 1 4.5-2.3"/><path d="M1.5 8.5A12 12 0 0 1 9 5"/></svg>;
    case 'plus':
      return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'pencil':
      return <svg {...props}><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/></svg>;
    case 'trash':
      return <svg {...props}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>;
    case 'key':
      return <svg {...props}><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/></svg>;
    case 'route':
      return <svg {...props}><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7"/></svg>;
    case 'gauge':
      return <svg {...props}><path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-5"/></svg>;
    case 'fuel':
      return <svg {...props}><path d="M5 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16"/><path d="M3 21h12"/><path d="M13 9h3l2 2v7a2 2 0 0 1-2-2v-3"/></svg>;
    case 'wash':
      return <svg {...props}><path d="M4 13l1.2-4.5A2 2 0 0 1 7.2 7h9.6a2 2 0 0 1 2 1.5L20 13"/><path d="M3 13h18v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4z"/><path d="M7 21v-3M12 21v-3M17 21v-3"/></svg>;
    case 'chart':
      return <svg {...props}><path d="M4 19V5"/><path d="M9 19V9"/><path d="M14 19v-7"/><path d="M19 19V8"/></svg>;
    case 'menu':
      return <svg {...props}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case 'users':
      return <svg {...props}><circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2.5 0 5 1.5 5 4"/></svg>;
    case 'refresh':
      return <svg {...props}><path d="M3 12a9 9 0 1 1 3 6.7"/><path d="M3 19v-5h5"/></svg>;
    case 'sync':
      return <svg {...props}><path d="M4 12a8 8 0 0 1 13.5-5.8L20 8"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.5 5.8L4 16"/><path d="M4 20v-4h4"/></svg>;
    case 'filter':
      return <svg {...props}><path d="M3 6h18M7 12h10M11 18h2"/></svg>;
    default:
      return null;
  }
}
