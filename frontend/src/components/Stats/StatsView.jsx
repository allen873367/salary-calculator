import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

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
        <button className="btn btn-sm btn-outline" onClick={() => window.print()}>列印報表</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="s-label">總收入</div>
          <div className="s-value accent">${stats.total_pay.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="s-label">上班天數</div>
          <div className="s-value">{stats.record_count}</div>
        </div>
        <div className="stat-card">
          <div className="s-label">最高連續上班</div>
          <div className="s-value" style={{ color: 'var(--accent)' }}>{stats.max_streak} 天</div>
        </div>
        <div className="stat-card">
          <div className="s-label">總工時</div>
          <div className="s-value warning">{stats.total_hours}h</div>
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
