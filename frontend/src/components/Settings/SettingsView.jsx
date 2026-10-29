import { useState, useEffect } from 'react';
import api from '../../utils/api';

const getUKey = (k) => {
  const u = localStorage.getItem('username');
  return u ? `${k}_${u}` : k;
};

export const defaultWage = () => Number(localStorage.getItem(getUKey('default_hourly_wage'))) || 196;
export const setDefaultWage = (v) => {
  const n = Number(v) || 0;
  if (n > 0) localStorage.setItem(getUKey('default_hourly_wage'), String(n));
  else localStorage.removeItem(getUKey('default_hourly_wage'));
  return n;
};

export const defaultMonthlyInsurance = () => Number(localStorage.getItem(getUKey('default_monthly_insurance'))) || 0;
export const setDefaultMonthlyInsurance = (v) => {
  const n = Number(v) || 0;
  if (n >= 0) localStorage.setItem(getUKey('default_monthly_insurance'), String(n));
  else localStorage.removeItem(getUKey('default_monthly_insurance'));
  return n;
};

export const defaultSchedule = () => {
  try {
    return JSON.parse(localStorage.getItem(getUKey('default_schedule_template')) || '{}');
  } catch {
    return {};
  }
};

export const setDefaultSchedule = (obj) => {
  if (obj) localStorage.setItem(getUKey('default_schedule_template'), JSON.stringify(obj));
  else localStorage.removeItem(getUKey('default_schedule_template'));
};

export default function SettingsView() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  // 常用班表設定狀態
  const [schedule, setSchedule] = useState(() => defaultSchedule());
  const [scheduleSaved, setScheduleSaved] = useState(false);

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

  const saveSchedule = () => {
    setDefaultSchedule(schedule);
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 2000);
  };

  return (
    <>
      {/* 薪資與勞健保偏好設定 */}
      <section className="card">
        <div className="card-title">薪資與勞健保設定</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          <div className="form-group">
            <label>預設時薪 <span className="hint">(元/時)</span></label>
            <input
              type="number"
              min="0"
              defaultValue={defaultWage()}
              onBlur={(e) => setDefaultWage(e.target.value)}
              placeholder="例如 196"
            />
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
              新增記錄時自動帶入
            </span>
          </div>

          <div className="form-group">
            <label>每月勞健保自付額 <span className="hint">(元/月)</span></label>
            <input
              type="number"
              min="0"
              defaultValue={defaultMonthlyInsurance() || ''}
              onBlur={(e) => setDefaultMonthlyInsurance(e.target.value)}
              placeholder="例如 800"
            />
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
              月統計報表中將自動計算扣除此費用後的實領薪資
            </span>
          </div>
        </div>
      </section>

      {/* 常用班表模板設定 */}
      <section className="card">
        <div className="card-title">常用班表設定（快速新增班次）</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '-6px 0 16px' }}>
          設定你每個月經常打工的時間與地點。在「新增記錄」頁面可一鍵套用，或按星期批次產生整月班表！
        </p>

        <div className="form-grid">
          <div className="form-group full">
            <label>常用店家</label>
            <select
              value={schedule.store || ''}
              onChange={(e) => setSchedule((s) => ({ ...s, store: e.target.value }))}
            >
              <option value="">-- 選擇常用店家 --</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>常用上班時間</label>
            <input
              type="text"
              placeholder="例如 09:00"
              value={schedule.start_time || ''}
              onChange={(e) => setSchedule((s) => ({ ...s, start_time: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>常用下班時間</label>
            <input
              type="text"
              placeholder="例如 18:00"
              value={schedule.end_time || ''}
              onChange={(e) => setSchedule((s) => ({ ...s, end_time: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>常用時薪</label>
            <input
              type="number"
              placeholder="留空則使用預設時薪"
              value={schedule.hourly_wage || ''}
              onChange={(e) => setSchedule((s) => ({ ...s, hourly_wage: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>備註說明</label>
            <input
              type="text"
              placeholder="例如：固定平日早班"
              value={schedule.notes || ''}
              onChange={(e) => setSchedule((s) => ({ ...s, notes: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
          <button type="button" className="btn btn-primary" onClick={saveSchedule}>
            儲存常用班表設定
          </button>
          {scheduleSaved && <span style={{ color: 'var(--success, #10b981)', fontSize: '0.9rem' }}>✓ 已儲存設定！</span>}
        </div>
      </section>

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
