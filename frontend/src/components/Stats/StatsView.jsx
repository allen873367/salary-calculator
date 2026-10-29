import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { defaultMonthlyInsurance } from '../Settings/SettingsView.jsx';

const exportCSV = async (month) => {
  try {
    const params = {};
    if (month) params.month = month;
    const res = await api.get('/export/csv/', { params, responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `打工薪資報表${month ? '_' + month : ''}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch { alert('匯出失敗'); }
};

export default function StatsView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('');
  const [months, setMonths] = useState([]);

  const load = useCallback(async (month) => {
    setLoading(true);
    try {
      const params = {};
      if (month) params.month = month;
      const res = await api.get('/stats/', { params });
      setStats(res.data);
      if (!month) {
        // Extract month list from unfiltered month_ranking
        const mList = (res.data.month_ranking || []).map((m) => m.month).sort().reverse();
        setMonths(mList);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(filterMonth); }, [filterMonth, load]);

  const handleMonthChange = (e) => {
    setFilterMonth(e.target.value);
  };

  if (loading && !stats) return <div className="empty-msg"><p>載入中...</p></div>;
  if (!stats || stats.record_count === 0) return (
    <section className="card">
      <div className="card-title">統計報表</div>
      <div className="empty-msg"><p>尚無資料</p></div>
    </section>
  );

  return (
    <section className="card">
      <div className="card-title">統計報表</div>

      <div className="filter-bar no-print">
        <select value={filterMonth} onChange={handleMonthChange}>
          <option value="">所有月份</option>
          {months.map((m) => {
            const [y, mo] = m.split('-');
            return <option key={m} value={m}>{y} 年 {parseInt(mo)} 月</option>;
          })}
        </select>
        <button className="btn btn-sm btn-outline" onClick={() => load(filterMonth)}>重新整理</button>
        <button className="btn btn-sm btn-primary" onClick={() => exportCSV(filterMonth)}>
          {filterMonth ? `匯出 ${parseInt(filterMonth.split('-')[1])} 月 Excel` : '匯出 Excel'}
        </button>
        <button className="btn btn-sm btn-outline" onClick={() => window.print()}>列印報表</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="s-label">實領總薪資</div>
          <div className="s-value accent">
            ${Math.max(stats.total_pay - (filterMonth ? defaultMonthlyInsurance() : (defaultMonthlyInsurance() * (months.length || 1))), 0).toLocaleString()}
          </div>
          {defaultMonthlyInsurance() > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
              已扣每月健保 ${filterMonth ? defaultMonthlyInsurance() : (defaultMonthlyInsurance() * (months.length || 1))}
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="s-label">應發總薪資 (毛額)</div>
          <div className="s-value" style={{ color: 'var(--success, #10b981)' }}>
            ${(stats.gross_pay ?? stats.total_pay).toLocaleString()}
          </div>
          {stats.total_ot_pay > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--warning, #eab308)', marginTop: 4 }}>
              含加班費 +${stats.total_ot_pay.toLocaleString()}
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="s-label">總上班工時</div>
          <div className="s-value warning">{stats.total_hours}h{stats.total_ot_hours > 0 ? ` (+${stats.total_ot_hours}h加班)` : ''}</div>
        </div>
        <div className="stat-card">
          <div className="s-label">上班天數 / 連續</div>
          <div className="s-value">{stats.record_count} 天 <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>({stats.max_streak}連)</span></div>
        </div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '20px 0 10px' }}>
        各店家收入
      </h3>
      <div className="store-breakdown">
        {stats.store_ranking.map((s) => (
          <div key={s.name} className="store-row">
            <span className="sr-name">{s.name}</span>
            <span>
              <span className="sr-amount">${s.amount.toLocaleString()}</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginLeft: 6 }}>({s.pct}%)</span>
            </span>
          </div>
        ))}
      </div>

      {!filterMonth ? (
        <>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '20px 0 10px' }}>
            每月收入
          </h3>
          <div className="store-breakdown">
            {stats.month_ranking.map((m) => {
              const [y, mo] = m.month.split('-');
              return (
                <div key={m.month} className="store-row">
                  <span className="sr-name">{y} 年 {parseInt(mo)} 月</span>
                  <span>
                    <span className="sr-amount" style={{ color: 'var(--success)' }}>${m.amount.toLocaleString()}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginLeft: 6 }}>({m.pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
