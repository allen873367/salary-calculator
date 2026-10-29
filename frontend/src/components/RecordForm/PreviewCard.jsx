export default function PreviewCard({ hours, wage, multiplier, otHours, otRate, subsidy, insurance }) {
  const h = Number(hours) || 0;
  const w = Number(wage) || 0;
  const m = Number(multiplier) || 1.0;
  const ot = Number(otHours) || 0;
  const or = Number(otRate) || 1.33;
  const s = Number(subsidy) || 0;
  const ins = Number(insurance) || 0;

  // 正確計算：一般上班工時本薪 + 加班工時加班費 + 津貼 - 勞健保
  const base = Math.round(h * w * m);
  const overtime = Math.round(ot * w * or);
  const gross = base + overtime + s;
  const total = Math.max(gross - ins, 0);

  return (
    <div className="preview-card">
      <div className="p-label">試算預覽</div>
      <div className="p-row">
        <span style={{ color: 'var(--text-secondary)' }}>本薪 ({h}h)</span>
        <span className="text-money">${base.toLocaleString()}</span>
      </div>
      {ot > 0 && (
        <div className="p-row">
          <span style={{ color: 'var(--text-secondary)' }}>加班費 ({ot}h · {or}x)</span>
          <span className="text-money" style={{ color: 'var(--warning, #eab308)' }}>+${overtime.toLocaleString()}</span>
        </div>
      )}
      {s > 0 && (
        <div className="p-row">
          <span style={{ color: 'var(--text-secondary)' }}>津貼</span>
          <span className="text-money" style={{ color: 'var(--success, #10b981)' }}>+${s.toLocaleString()}</span>
        </div>
      )}
      {ins > 0 && (
        <div className="p-row">
          <span style={{ color: 'var(--text-secondary)' }}>勞健保自付</span>
          <span className="text-money" style={{ color: 'var(--danger, #ef4444)' }}>-${ins.toLocaleString()}</span>
        </div>
      )}
      {m !== 1.0 && (
        <div className="p-row">
          <span style={{ color: 'var(--text-secondary)' }}>倍率</span>
          <span className="text-money">{m}x</span>
        </div>
      )}
      <div className="p-row total">
        <span>實領總計</span>
        <span>${total.toLocaleString()}</span>
      </div>
    </div>
  );
}
