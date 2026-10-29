import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import PreviewCard from './PreviewCard';
import { defaultWage, defaultSchedule } from '../Settings/SettingsView.jsx';

const RATE_OPTIONS = [
  { value: '1.0', label: '1.0x — 一般平日' },
  { value: '1.33', label: '1.33x — 平日延長工時前 2h' },
  { value: '1.66', label: '1.66x — 平日延長工時第 3h 起' },
  { value: '2.0', label: '2.0x — 國定假日／颱風天' },
  { value: '2.66', label: '2.66x — 休息日出勤' },
];

function parseTime(digits) {
  // 24:00 == 午夜 → 00:00
  if (digits === '24' || digits === '2400') return '00:00';
  let h, m;
  if (digits.length === 2) { h = parseInt(digits); m = 0; }
  else if (digits.length === 3) { h = parseInt(digits[0]); m = parseInt(digits.slice(1)); }
  else { h = parseInt(digits.slice(0, 2)); m = parseInt(digits.slice(2)); }
  if (h > 23) h = 23;
  if (m > 59) m = 59;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

function smartTime(raw) {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
  if (!digits) return '';
  if (digits.length === 1) return '0' + digits + ':00';
  return parseTime(digits);
}

function autoHours(start, end) {
  if (!start || !end) return null;
  if (!start.includes(':') || !end.includes(':')) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  let s = sh * 60 + sm, e = eh * 60 + em;
  if (e <= s) e += 1440;
  const minutes = e - s;
  return Math.round(minutes * 100 / 60) / 100;
}

export default function RecordForm({ onSaved }) {
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({
    store: '', date: new Date().toISOString().slice(0, 10),
    start_time: '', end_time: '', hours: '',
    hourly_wage: defaultWage(), rate_multiplier: '1.0',
    overtime_start: '', overtime_end: '', overtime_hours: 0,
    overtime_rate: 1.33, subsidy: 0, insurance: 0, notes: '',
  });
  const [newStore, setNewStore] = useState('');

  // 批次快速排班彈窗狀態
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchMonth, setBatchMonth] = useState(new Date().toISOString().slice(0, 7));
  const [batchStore, setBatchStore] = useState('');
  const [batchStart, setBatchStart] = useState('');
  const [batchEnd, setBatchEnd] = useState('');
  const [batchHours, setBatchHours] = useState('');
  const [batchWage, setBatchWage] = useState(defaultWage());
  const [batchMultiplier, setBatchMultiplier] = useState('1.0');
  const [batchSubsidy, setBatchSubsidy] = useState(0);
  const [batchInsurance, setBatchInsurance] = useState(0);
  const [batchNotes, setBatchNotes] = useState('');
  const [batchWeekdays, setBatchWeekdays] = useState([1, 2, 3, 4, 5]); // 1=Mon, ..., 7=Sun
  const [batchSubmitting, setBatchSubmitting] = useState(false);

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

  const onOTimeChange = useCallback((field, value) => {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'overtime_start') next.overtime_start = value;
      if (field === 'overtime_end') next.overtime_end = value;
      const ot = autoHours(next.overtime_start, next.overtime_end);
      next.overtime_hours = ot !== null ? ot : 0;
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
        overtime_start: form.overtime_start || null,
        overtime_end: form.overtime_end || null,
        overtime_hours: Number(form.overtime_hours) || 0,
        overtime_rate: Number(form.overtime_rate) || 1.33,
        subsidy: Number(form.subsidy) || 0,
        insurance: Number(form.insurance) || 0,
        notes: form.notes,
      });
      setForm((f) => ({
        ...f, store: '', start_time: '', end_time: '', hours: '',
        overtime_start: '', overtime_end: '', overtime_hours: 0, subsidy: 0, insurance: 0, notes: '',
      }));
      onSaved?.();
    } catch (err) {
      alert('儲存失敗：' + (err.response?.data?.detail || err.message));
    }
  };

  // 帶入常用班表
  const applyDefaultSchedule = () => {
    const s = defaultSchedule();
    if (!s || (!s.store && !s.start_time && !s.end_time)) {
      alert('尚未設定常用班表！請至「設定」頁面先儲存常用班表。');
      return;
    }
    setForm((prev) => {
      const next = { ...prev };
      if (s.store) next.store = s.store;
      if (s.start_time) next.start_time = s.start_time;
      if (s.end_time) next.end_time = s.end_time;
      if (s.hourly_wage) next.hourly_wage = s.hourly_wage;
      if (s.notes) next.notes = s.notes;
      const h = autoHours(next.start_time, next.end_time);
      if (h !== null) next.hours = h;
      return next;
    });
  };

  // 開啟批次排班並帶入常用班表
  const openBatchModal = () => {
    const s = defaultSchedule();
    if (s.store) setBatchStore(s.store);
    else if (stores.length > 0) setBatchStore(stores[0].id);
    if (s.start_time) setBatchStart(s.start_time);
    if (s.end_time) setBatchEnd(s.end_time);
    const h = autoHours(s.start_time, s.end_time);
    setBatchHours(h || '');
    if (s.hourly_wage) setBatchWage(s.hourly_wage);
    else setBatchWage(defaultWage());
    if (s.notes) setBatchNotes(s.notes);
    setBatchOpen(true);
  };

  // 計算選中月份符合星期幾的所有日期
  const getBatchDates = () => {
    if (!batchMonth) return [];
    const [y, m] = batchMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const dates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(y, m - 1, day);
      // JS getDay(): 0 is Sun, 1 is Mon, ..., 6 is Sat -> map to 1..7 (1=Mon..7=Sun)
      const jsDay = dt.getDay();
      const isoWeekday = jsDay === 0 ? 7 : jsDay;
      if (batchWeekdays.includes(isoWeekday)) {
        const dStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push(dStr);
      }
    }
    return dates;
  };

  const handleBatchSubmit = async () => {
    if (!batchStore) { alert('請選擇店家'); return; }
    if (!batchHours || Number(batchHours) <= 0) { alert('請填寫工時或上下班時間'); return; }
    const dates = getBatchDates();
    if (dates.length === 0) { alert('目前選取的星期幾在該月份沒有任何日期'); return; }
    if (!confirm(`即將在 ${batchMonth} 新增 ${dates.length} 筆打工記錄，確定建立嗎？`)) return;

    setBatchSubmitting(true);
    try {
      const res = await api.post('/records/batch/', {
        store: batchStore,
        dates,
        start_time: batchStart || null,
        end_time: batchEnd || null,
        hours: batchHours,
        hourly_wage: Number(batchWage) || 0,
        rate_multiplier: batchMultiplier,
        subsidy: Number(batchSubsidy) || 0,
        insurance: Number(batchInsurance) || 0,
        notes: batchNotes,
        skip_existing: true,
      });
      alert(res.data.message || '批次排班成功！');
      setBatchOpen(false);
      onSaved?.();
    } catch (err) {
      alert('批次建立失敗：' + (err.response?.data?.error || err.message));
    } finally {
      setBatchSubmitting(false);
    }
  };

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div className="card-title" style={{ margin: 0 }}>新增打工記錄</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-sm btn-outline" onClick={applyDefaultSchedule} title="帶入在設定中儲存的常用班表">
            ⚡ 帶入常用班表
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={openBatchModal} title="每月固定排班一鍵新增多筆">
            📅 批次快速排班
          </button>
        </div>
      </div>
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
                <input type="number" step="0.01" min="0" value={form.hours}
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
                <label>加班開始 <span className="hint">(24h)</span></label>
                <input
                  type="text" placeholder="17:00" inputMode="numeric"
                  value={form.overtime_start}
                  onChange={(e) => onOTimeChange('overtime_start', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  onBlur={(e) => onOTimeChange('overtime_start', smartTime(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>加班結束 <span className="hint">(24h)</span></label>
                <input
                  type="text" placeholder="18:00" inputMode="numeric"
                  value={form.overtime_end}
                  onChange={(e) => onOTimeChange('overtime_end', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  onBlur={(e) => onOTimeChange('overtime_end', smartTime(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>加班時數 <span className="hint">(自動)</span></label>
                <input type="number" step="0.01" min="0" value={form.overtime_hours}
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
              <div className="form-group">
                <label>津貼 <span className="hint">(元)</span></label>
                <input type="number" step="1" min="0" value={form.subsidy}
                  onChange={(e) => update('subsidy', e.target.value)} placeholder="車馬費、誤餐費" />
              </div>
              <div className="form-group">
                <label>勞健保自付額 <span className="hint">(元)</span></label>
                <input type="number" step="1" min="0" value={form.insurance}
                  onChange={(e) => update('insurance', e.target.value)} placeholder="選填，單次預扣" />
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
                overtime_start: '', overtime_end: '', overtime_hours: 0, subsidy: 0, insurance: 0, notes: '',
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
              subsidy={form.subsidy}
              insurance={form.insurance}
            />
          </div>
        </div>
      </form>

      {/* 批次排班 Modal */}
      {batchOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          padding: 16,
        }} onClick={() => setBatchOpen(false)}>
          <div style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 540,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>批次排班（快速新增整月班次）</h3>
              <button type="button" className="action-btn" onClick={() => setBatchOpen(false)} style={{ fontSize: '1.2rem' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              設定固定的排班時間與地點，勾選每週固定上班的星期幾，系統將自動為你一鍵生成該月份所有薪資筆數！已存在的日期會自動略過不重複新增。
            </p>

            <div className="form-grid">
              <div className="form-group full">
                <label>選擇排班月份</label>
                <input
                  type="month"
                  value={batchMonth}
                  onChange={(e) => setBatchMonth(e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label>店家名稱</label>
                <select value={batchStore} onChange={(e) => setBatchStore(e.target.value)}>
                  <option value="">-- 選擇店家 --</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>上班時間</label>
                <input
                  type="text" placeholder="09:00"
                  value={batchStart}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBatchStart(v);
                    const h = autoHours(v, batchEnd);
                    if (h !== null) setBatchHours(h);
                  }}
                />
              </div>

              <div className="form-group">
                <label>下班時間</label>
                <input
                  type="text" placeholder="18:00"
                  value={batchEnd}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBatchEnd(v);
                    const h = autoHours(batchStart, v);
                    if (h !== null) setBatchHours(h);
                  }}
                />
              </div>

              <div className="form-group">
                <label>總工時 (時)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={batchHours}
                  onChange={(e) => setBatchHours(e.target.value)}
                  placeholder="自動計算"
                />
              </div>

              <div className="form-group">
                <label>時薪 (元/時)</label>
                <input
                  type="number" min="0"
                  value={batchWage}
                  onChange={(e) => setBatchWage(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>薪資倍率</label>
                <select value={batchMultiplier} onChange={(e) => setBatchMultiplier(e.target.value)}>
                  {RATE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>每筆津貼 (元)</label>
                <input
                  type="number" min="0"
                  value={batchSubsidy}
                  onChange={(e) => setBatchSubsidy(e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label style={{ marginBottom: 6 }}>固定上班日 (星期幾)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setBatchWeekdays([1, 2, 3, 4, 5])}>平日 (一~五)</button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setBatchWeekdays([6, 7])}>週末 (六日)</button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setBatchWeekdays([1, 2, 3, 4, 5, 6, 7])}>全部</button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setBatchWeekdays([])}>清空</button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { id: 1, label: '週一' },
                    { id: 2, label: '週二' },
                    { id: 3, label: '週三' },
                    { id: 4, label: '週四' },
                    { id: 5, label: '週五' },
                    { id: 6, label: '週六' },
                    { id: 7, label: '週日' },
                  ].map((w) => {
                    const checked = batchWeekdays.includes(w.id);
                    return (
                      <label key={w.id} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 10px', borderRadius: 8,
                        background: checked ? 'var(--accent-light, #eff6ff)' : 'var(--bg-secondary, #f1f5f9)',
                        border: `1px solid ${checked ? 'var(--accent, #2563eb)' : 'var(--border, #cbd5e1)'}`,
                        cursor: 'pointer', fontSize: '0.85rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setBatchWeekdays((prev) => [...prev, w.id]);
                            else setBatchWeekdays((prev) => prev.filter((x) => x !== w.id));
                          }}
                        />
                        {w.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="form-group full">
                <label>備註說明</label>
                <input
                  type="text"
                  placeholder="例如：固定早班"
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{
              margin: '16px 0', padding: 12, borderRadius: 8,
              background: 'var(--bg-secondary, #f8fafc)', border: '1px dashed var(--border)',
              fontSize: '0.85rem'
            }}>
              <div>已選取天數：<strong>{getBatchDates().length} 天</strong></div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 4, maxHeight: 60, overflowY: 'auto' }}>
                {getBatchDates().join(', ') || '無符合日期'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setBatchOpen(false)}>取消</button>
              <button type="button" className="btn btn-primary" onClick={handleBatchSubmit} disabled={batchSubmitting || getBatchDates().length === 0}>
                {batchSubmitting ? '建立中...' : `一鍵快速建立 ${getBatchDates().length} 筆記錄`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
