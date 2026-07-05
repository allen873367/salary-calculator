import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function SettingsView() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const res = await api.get('/stores/');
      setStores(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/backup/export/');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `打工薪資備份_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('匯出失敗');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.records || !Array.isArray(data.records)) {
        alert('備份檔格式錯誤');
        return;
      }
      if (!confirm(`將以 ${data.records.length} 筆備份資料取代現有資料，確定嗎？`)) {
        setImporting(false);
        e.target.value = '';
        return;
      }
      await api.post('/backup/import/', data);
      alert(`成功匯入 ${data.records.length} 筆資料！`);
      window.location.reload();
    } catch (err) {
      alert('匯入失敗：' + err.message);
    }
    setImporting(false);
    e.target.value = '';
  };

  const handleDeleteStore = async (storeId, storeName) => {
    if (!confirm(`確定要刪除「${storeName}」嗎？（相關記錄的店家會變成「未指定」）`)) return;
    try {
      await api.delete(`/stores/${storeId}/`);
      loadStores();
    } catch {
      alert('刪除失敗，可能該店家還有記錄無法刪除');
    }
  };

  const handleClear = async () => {
    if (!confirm('確定要清除所有打工資料嗎？此操作無法復原！')) return;
    if (!confirm('最後確認：真的要全部刪除嗎？')) return;
    try {
      const res = await api.get('/records/');
      for (const r of res.data) {
        await api.delete(`/records/${r.id}/`);
      }
      alert('已清除所有資料');
      window.location.reload();
    } catch {
      alert('清除失敗');
    }
  };

  return (
    <>
      {/* Store Management */}
      <section className="card">
        <div className="card-title">店家管理</div>
        {loading ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>載入中...</div>
        ) : stores.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>尚無店家</div>
        ) : (
          <div style={{ display: 'grid', gap: 6, maxWidth: 400 }}>
            {stores.map((s) => (
              <div key={s.id} className="store-row">
                <span className="sr-name">{s.name}</span>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteStore(s.id, s.name)}
                >
                  刪除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Backup & Clear */}
      <section className="card">
        <div className="card-title">資料管理</div>
        <div style={{ display: 'grid', gap: 16, maxWidth: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 500 }}>備份資料</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>下載 JSON 備份檔</div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={handleExport}>匯出</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 500 }}>還原備份</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>上傳 JSON 備份檔還原資料</div>
            </div>
            <label>
              <button className="btn btn-sm btn-outline" onClick={() => document.getElementById('importFile').click()} style={{ pointerEvents: 'none' }}>
                {importing ? '匯入中...' : '選擇檔案'}
              </button>
              <input id="importFile" type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <div>
              <div style={{ fontWeight: 500 }}>清除資料</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>刪除所有打工記錄（不可復原）</div>
            </div>
            <button className="btn btn-sm btn-danger" onClick={handleClear}>清除</button>
          </div>
        </div>
      </section>
    </>
  );
}
