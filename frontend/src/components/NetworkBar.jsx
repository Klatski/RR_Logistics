import { useEffect, useState } from 'react';
import { Icon } from './Icons.jsx';
import { syncPendingActions } from '../lib/offline.js';

export default function NetworkBar() {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    function up() {
      setOnline(true);
      setSyncing(true);
      syncPendingActions().finally(() => setSyncing(false));
    }
    function down() { setOnline(false); }
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (online && !syncing) return null;
  if (!online) {
    return (
      <div className="network-bar network-bar--offline">
        <Icon name="wifi-off" size={14} />
        Нет сети — данные сохраняются локально
      </div>
    );
  }
  return (
    <div className="network-bar network-bar--sync">
      <span className="spinner" />
      Синхронизация...
    </div>
  );
}
