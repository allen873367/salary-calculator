const SECTIONS = [
  {
    title: '1. 新增打工記錄',
    items: [
      '選擇店家（可輸入新店家直接新增）',
      '填上班／下班時間（24h），工時會自動計算',
      '若有加班，填加班開始／結束時間，加班時數自動計算',
      '設定時薪、薪資倍率、加班費率',
    ],
  },
  {
    title: '2. 薪資怎麼算',
    items: [
      '本薪 =（上班時數 − 加班時數）× 時薪 × 薪資倍率',
      '加班費 = 加班時數 × 時薪 × 加班費率（1.33／1.66／2.0 倍）',
      '加班時間若和上班時間重疊，會從上班時數扣掉，不會重複計算',
      '津貼（車馬費）會直接加在合計',
      '倍率 2.0（國定假日／颱風天）或 2.66（休息日）的記錄，列表會用螢光色標示',
    ],
  },
  {
    title: '3. 篩選與匯出',
    items: [
      '記錄列表可依店家、月份篩選，並匯出 CSV',
      '統計報表選了某個月後，按「匯出 CSV」只會匯出那個月',
      'CSV 可用 Excel 開啟，含上班／下班、加班時間與每月小計',
    ],
  },
  {
    title: '4. 資料安全',
    items: [
      '設定頁可匯出備份（JSON）、匯入還原',
      '建議每月匯出一次 CSV 或備份，避免資料遺失',
    ],
  },
];

export default function UserGuide({ open, onClose }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        width: '95%', maxWidth: 520, maxHeight: '86vh', overflow: 'auto',
        padding: '24px 28px', position: 'relative',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700,
        }}>
          <span>打工薪資計算器 — 使用說明</span>
          <button className="action-btn" onClick={onClose} style={{ fontSize: '1.2rem', opacity: 0.5 }}>✕</button>
        </div>
        {SECTIONS.map((s) => (
          <div key={s.title} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--accent)' }}>{s.title}</div>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4, fontSize: '0.9rem' }}>
              {s.items.map((it) => <li key={it} style={{ color: 'var(--text-secondary)' }}>{it}</li>)}
            </ul>
          </div>
        ))}
        <div className="btn-group center" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={onClose}>開始使用</button>
        </div>
      </div>
    </div>
  );
}
