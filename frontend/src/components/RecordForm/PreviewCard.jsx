export default function PreviewCard({ hours, wage, multiplier, otHours, otRate, subsidy }) {
  const h = Number(hours) || 0;
  const w = Number(wage) || 0;
  const m = Number(multiplier) || 1.0;
  const ot = Number(otHours) || 0;
  const or = Number(otRate) || 1.33;
  const s = Number(subsidy) || 0;

  const base = Math.round(h * w * m);
  const overtime = Math.round(ot * w * or);
  const total = base + overtime + s;

  return (
    <div className="preview-card">
      <div className="p-label">試算預覽</div>
      <div className="p-row">
        <span style={{ color: 'var(--text-secondary)' }}>本薪</span>
        <span className="text-money">${base.toLocaleString()}</span>
      </div>
      <div className="p-row">
        <span style={{ color: 'var(--text-secondary)' }}>加班費</span>
        <span className="text-money">${overtime.toLocaleString()}</span>
      </div>
      {s > 0 && (
        <div className="p-row">
          <span style={{ color: 'var(--text-secondary)' }}>津貼</span>
          <span className="text-money" style={{ color: 'var(--success)' }}>+${s.toLocaleString()}</span>
        </div>
      )}
      <div className="p-row">
        <span style={{ color: 'var(--text-secondary)' }}>倍率</span>
        <span className="text-money">{m}x</span>
      </div>
      <div className="p-row total">
        <span>總計</span>
        <span>${total.toLocaleString()}</span>
      </div>
    </div>
  );
}
