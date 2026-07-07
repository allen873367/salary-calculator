import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

function smartTime(raw) {
  if (!raw) return '';
  let digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
  if (!digits) return '';
  if (digits.length === 1) return '0' + digits + ':00';
  if (digits.length === 2) {
    let h = parseInt(digits);
    if (h > 23) return '23:59';
    return digits + ':00';
  }
  if (digits.length === 3) {
    let h = parseInt(digits[0]), m = parseInt(digits.slice(1));
    if (h > 23) h = 23;
    if (m > 59) m = 59;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  let h = parseInt(digits.slice(0, 2)), m = parseInt(digits.slice(2));
  if (h > 23) h = 23;
  if (m > 59) m = 59;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

function autoHours(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let s = sh * 60 + sm, e = eh * 60 + em;
  if (e <= s) e += 1440;
  return Math.round((e - s) / 6) / 10;
}

const RATE_OPTIONS = [
  { value: '1.0', label: '1.0x — 一般平日' },
  { value: '1.33', label: '1.33x — 平日延長工時前 2h' },
  { value: '1.66', label: '1.66x — 平日延長工時第 3h 起' },
  { value: '2.0', label: '2.0x — 國定假日／颱風天' },
  { value: '2.66', label: '2.66x — 休息日出勤' },
];

export default function RecordList() {
  const [records, setRecords] = useState([]);
  const [stores, setStores] = useState([]);
  const [filterStore, setFilterStore] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState(null); // modal state

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStore) params.store = filterStore;
      if (filterMonth) params.month = filterMonth;
      const [rRes, sRes] = await Promise.all([
        api.get('/records/', { params }),
        api.get('/stores/'),
      ]);
      setRecords(rRes.data);
      setStores(sRes.data);
      const mSet = new Set(rRes.data.map((r) => r.date.slice(0, 7)));
      setMonths([...mSet].sort().reverse());
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [filterStore, filterMonth]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除這筆記錄嗎？')) return;
    await api.delete(`/records/${id}/`);
    load();
  };

  const handleEditSave = async () => {
    if (!editRecord) return;
    if (!editRecord.hours || Number(editRecord.hours) <= 0) {
      alert('請輸入工時');
      return;
    }
    try {
      await api.put(`/records/${editRecord.id}/`, {
        store: editRecord.store,
        date: editRecord.date,
        start_time: editRecord.start_time || null,
        end_time: editRecord.end_time || null,
        hours: editRecord.hours,
        hourly_wage: Number(editRecord.hourly_wage),
        rate_multiplier: editRecord.rate_multiplier,
        overtime_hours: Number(editRecord.overtime_hours) || 0,
        overtime_rate: Number(editRecord.overtime_rate) || 1.33,
        subsidy: Number(editRecord.subsidy) || 0,
        notes: editRecord.notes,
      });
      setEditRecord(null);
      load();
    } catch (err) {
      alert('更新失敗：' + (err.response?.data?.detail || err.message));
    }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get('/export/csv/', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `打工薪資報表_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('匯出失敗'); }
  };

  return (
    <section className="card">
      <div className="card-title">記錄列表</div>

      <div className="filter-bar no-print">
        <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
          <option value="">所有店家</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
          <option value="">所有月份</option>
          {months.map((m) => {
            const [y, mo] = m.split('-');
            return <option key={m} value={m}>{y} 年 {parseInt(mo)} 月</option>;
          })}
        </select>
        <button className="btn btn-sm btn-outline" onClick={load}>重新整理</button>
        <button className="btn btn-sm btn-primary" onClick={exportCSV}>匯出 CSV</button>
        <button className="btn btn-sm btn-outline" onClick={() => window.print()}>列印</button>
      </div>

      {loading ? (
        <div className="empty-msg"><p>載入中...</p></div>
      ) : records.length === 0 ? (
        <div className="empty-msg"><p>還沒有打工記錄</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日期</th><th>店家</th><th>時薪</th><th>工時</th>
                <th style={{ textAlign: 'right' }}>本薪</th>
                <th style={{ textAlign: 'right' }}>津貼</th>
                <th style={{ textAlign: 'right' }}>合計</th>
                <th style={{ textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span>{r.date.replace(/-/g, '/')}</span>
                    {r.start_time ? <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      <br/>{r.start_time}-{r.end_time}
                    </span> : null}
                  </td>
                  <td><span className="text-store">{r.store_name || '(未指定)'}</span></td>
                  <td>${r.hourly_wage}</td>
                  <td>{r.hours}h</td>
                  <td style={{ textAlign: 'right' }} className="text-money">
                    ${Math.round(Number(r.hours) * Number(r.hourly_wage) * Number(r.rate_multiplier)).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--success)' }}>
                    {Number(r.subsidy) > 0 ? `+$${Number(r.subsidy).toLocaleString()}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                    ${r.total_pay?.toLocaleString() || '0'}
                  </td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button className="action-btn" onClick={() => setEditRecord({
                      id: r.id, store: r.store || '', date: r.date,
                      start_time: r.start_time || '', end_time: r.end_time || '',
                      hours: r.hours, hourly_wage: r.hourly_wage,
                      rate_multiplier: r.rate_multiplier,
                      overtime_hours: r.overtime_hours || 0,
                      overtime_rate: r.overtime_rate,
                      subsidy: r.subsidy || 0,
                      notes: r.notes || '',
                    })} title="編輯">編輯</button>
                    <button className="action-btn" onClick={() => handleDelete(r.id)} title="刪除">刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editRecord && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
        }} onClick={() => setEditRecord(null)}>
          <div style={{
            width: '95%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto',
            margin: 0, padding: '24px 28px', position: 'relative',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 20, fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600,
            }}>
              <span>編輯記錄</span>
              <button className="action-btn" onClick={() => setEditRecord(null)} style={{ fontSize: '1.2rem', opacity: 0.5 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group">
                  <label>店家</label>
                  <select value={editRecord.store} onChange={(e) => setEditRecord({...editRecord, store: e.target.value})}>
                    <option value="">-- 選擇 --</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>日期</label>
                  <input type="date" value={editRecord.date}
                    onChange={(e) => setEditRecord({...editRecord, date: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group">
                  <label>上班</label>
                  <input type="text" inputMode="numeric" placeholder="09:00" value={editRecord.start_time}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      setEditRecord((prev) => ({...prev, start_time: val}));
                    }}
                    onBlur={(e) => {
                      const start = smartTime(e.target.value);
                      setEditRecord((prev) => {
                        const next = {...prev, start_time: start};
                        const h = autoHours(start, next.end_time);
                        if (h !== null) next.hours = h;
                        return next;
                      });
                    }} />
                </div>
                <div className="form-group">
                  <label>下班</label>
                  <input type="text" inputMode="numeric" placeholder="18:00" value={editRecord.end_time}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      setEditRecord((prev) => ({...prev, end_time: val}));
                    }}
                    onBlur={(e) => {
                      const end = smartTime(e.target.value);
                      setEditRecord((prev) => {
                        const next = {...prev, end_time: end};
                        const h = autoHours(next.start_time, end);
                        if (h !== null) next.hours = h;
                        return next;
                      });
                    }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group">
                  <label>工時</label>
                  <input type="number" step="0.5" min="0" value={editRecord.hours}
                    onChange={(e) => setEditRecord({...editRecord, hours: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>時薪</label>
                  <input type="number" step="1" min="0" value={editRecord.hourly_wage}
                    onChange={(e) => setEditRecord({...editRecord, hourly_wage: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group">
                  <label>倍率</label>
                  <select value={editRecord.rate_multiplier}
                    onChange={(e) => setEditRecord({...editRecord, rate_multiplier: e.target.value})}>
                    {RATE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>加班時數</label>
                  <input type="number" step="0.5" min="0" value={editRecord.overtime_hours}
                    onChange={(e) => setEditRecord({...editRecord, overtime_hours: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group">
                  <label>加班費率</label>
                  <select value={editRecord.overtime_rate}
                    onChange={(e) => setEditRecord({...editRecord, overtime_rate: e.target.value})}>
                    <option value="1.33">1.33 倍</option>
                    <option value="1.66">1.66 倍</option>
                    <option value="2.0">2.0 倍</option>
                    <option value="1.0">1.0 倍</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>津貼</label>
                  <input type="number" step="1" min="0" value={editRecord.subsidy}
                    onChange={(e) => setEditRecord({...editRecord, subsidy: e.target.value})}
                    placeholder="車馬費" />
                </div>
              </div>
              <div className="form-group">
                <label>備註</label>
                <textarea rows="1" value={editRecord.notes}
                  onChange={(e) => setEditRecord({...editRecord, notes: e.target.value})} />
              </div>
            </div>

            <div className="btn-group center" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={handleEditSave}>更新記錄</button>
              <button className="btn btn-outline" onClick={() => setEditRecord(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
