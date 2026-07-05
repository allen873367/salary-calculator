import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import PreviewCard from './PreviewCard';

const RATE_OPTIONS = [
  { value: '1.0', label: '1.0x — 一般平日' },
  { value: '1.33', label: '1.33x — 平日延長工時前 2h' },
  { value: '1.66', label: '1.66x — 平日延長工時第 3h 起' },
  { value: '2.0', label: '2.0x — 國定假日／颱風天' },
  { value: '2.66', label: '2.66x — 休息日出勤' },
];

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

export default function RecordForm({ onSaved }) {
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({
    store: '', date: new Date().toISOString().slice(0, 10),
    start_time: '', end_time: '', hours: '',
    hourly_wage: 196, rate_multiplier: '1.0',
    overtime_hours: 0, overtime_rate: 1.33, notes: '',
  });
  const [newStore, setNewStore] = useState('');

  const loadStores = () => {
    api.get('/stores/').then((r) => setStores(r.data)).catch(() => {});
  };

  useEffect(() => { loadStores(); }, []);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const onTimeChange = useCallback((field, value) => {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'start_time') next.start_time = value;
      if (field === 'end_time') next.end_time = value;
      const h = autoHours(next.start_time, next.end_time);
      if (h !== null) next.hours = h;
      return next;
    });
  }, []);

  const addStore = async () => {
    const name = newStore.trim();
    if (!name) return;
    try {
      const { data } = await api.post('/stores/', { name });
      setStores((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      update('store', data.id);
      setNewStore('');
    } catch (err) {
      if (err.response?.status === 400) {
        alert('該店家已存在');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.store) { alert('請選擇店家'); return; }
    if (!form.hours || Number(form.hours) <= 0) { alert('請輸入工時'); return; }
    try {
      await api.post('/records/', {
        store: form.store, date: form.date,
        start_time: form.start_time || null, end_time: form.end_time || null,
        hours: form.hours, hourly_wage: Number(form.hourly_wage),
        rate_multiplier: form.rate_multiplier,
        overtime_hours: Number(form.overtime_hours) || 0,
        overtime_rate: Number(form.overtime_rate) || 1.33,
        notes: form.notes,
      });
      setForm((f) => ({
        ...f, store: '', start_time: '', end_time: '', hours: '',
        overtime_hours: 0, notes: '',
      }));
      onSaved?.();
    } catch (err) {
      alert('儲存失敗：' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <section className="card">
      <div className="card-title">新增打工記錄</div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="form-grid">
              <div className="form-group full">
                <label>店家名稱</label>
                <div className="select-add">
                  <select value={form.store} onChange={(e) => update('store', e.target.value)}>
                    <option value="">-- 選擇店家 --</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={newStore}
                      onChange={(e) => setNewStore(e.target.value)}
                      placeholder="新店家"
                      style={{ width: 100, padding: '10px 8px', fontSize: '0.82rem' }}
                    />
                    <button type="button" className="btn btn-sm btn-outline" onClick={addStore} title="新增店家">＋</button>
                    <button type="button" className="btn btn-sm btn-outline" onClick={loadStores} title="重新整理店家列表" style={{ fontSize: '0.8rem' }}>↻</button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>日期</label>
                <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
              </div>
              <div className="form-group">
                <label>上班時間 <span className="hint">(24h)</span></label>
                <input
                  type="text" placeholder="09:00" inputMode="numeric"
                  value={form.start_time}
                  onChange={(e) => onTimeChange('start_time', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  onBlur={(e) => onTimeChange('start_time', smartTime(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>下班時間 <span className="hint">(24h)</span></label>
                <input
                  type="text" placeholder="18:00" inputMode="numeric"
                  value={form.end_time}
                  onChange={(e) => onTimeChange('end_time', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  onBlur={(e) => onTimeChange('end_time', smartTime(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>總工時 <span className="hint">(時)</span></label>
                <input type="number" step="0.5" min="0" value={form.hours}
                  onChange={(e) => update('hours', e.target.value)} placeholder="自動計算" />
              </div>
              <div className="form-group">
                <label>時薪 <span className="hint">(元/時)</span></label>
                <input type="number" step="1" min="0" value={form.hourly_wage}
                  onChange={(e) => update('hourly_wage', e.target.value)} />
              </div>
              <div className="form-group">
                <label>薪資倍率</label>
                <select value={form.rate_multiplier} onChange={(e) => update('rate_multiplier', e.target.value)}>
                  {RATE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>加班時數 <span className="hint">(時)</span></label>
                <input type="number" step="0.5" min="0" value={form.overtime_hours}
                  onChange={(e) => update('overtime_hours', e.target.value)} />
              </div>
              <div className="form-group">
                <label>加班費率</label>
                <select value={form.overtime_rate} onChange={(e) => update('overtime_rate', e.target.value)}>
                  <option value="1.33">1.33 倍（平日延長前 2h）</option>
                  <option value="1.66">1.66 倍（平日延長第 3h 起）</option>
                  <option value="2.0">2.0 倍（例假日出勤）</option>
                  <option value="1.0">1.0 倍（無加班費）</option>
                </select>
              </div>
              <div className="form-group full">
                <label>備註</label>
                <textarea rows="1" value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="早班、晚班、颱風天出勤..." />
              </div>
            </div>
            <div className="btn-group center" style={{ marginTop: 20 }}>
              <button type="submit" className="btn btn-primary">儲存記錄</button>
              <button type="button" className="btn btn-outline" onClick={() => setForm((f) => ({
                ...f, store: '', start_time: '', end_time: '', hours: '',
                overtime_hours: 0, notes: '',
              }))}>清除</button>
            </div>
          </div>

          <div style={{ minWidth: 200 }}>
            <PreviewCard
              hours={form.hours}
              wage={form.hourly_wage}
              multiplier={form.rate_multiplier}
              otHours={form.overtime_hours}
              otRate={form.overtime_rate}
            />
          </div>
        </div>
      </form>
    </section>
  );
}
