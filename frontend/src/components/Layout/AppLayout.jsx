import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import RecordForm from '../RecordForm/RecordForm';
import RecordList from '../RecordList/RecordList';
import StatsView from '../Stats/StatsView';
import SettingsView from '../Settings/SettingsView';

const TABS = [
  { key: 'form', label: '新增記錄' },
  { key: 'records', label: '記錄列表' },
  { key: 'stats', label: '統計報表' },
  { key: 'settings', label: '設定' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('form');
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="app-wrap">
      <header className="app-header">
        <h1>打工薪資計算器</h1>
        <div className="user-area">
          <span>{user?.username}</span>
          <button className="btn btn-sm btn-outline" onClick={logout}>登出</button>
        </div>
      </header>

      <div className="card" style={{ padding: '0 32px' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`tab-content ${activeTab === 'form' ? 'active' : ''}`}>
        <RecordForm onSaved={triggerRefresh} />
      </div>
      <div className={`tab-content ${activeTab === 'records' ? 'active' : ''}`}>
        <RecordList key={refreshKey} />
      </div>
      <div className={`tab-content ${activeTab === 'stats' ? 'active' : ''}`}>
        <StatsView key={refreshKey} />
      </div>
      <div className={`tab-content ${activeTab === 'settings' ? 'active' : ''}`}>
        <SettingsView />
      </div>
    </div>
  );
}
