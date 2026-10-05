export default function KpiCard({ label, value, unit, colorVar, semaphore }) {
  return (
    <div className="kpi" style={{ "--k": `var(${colorVar})` }}>
      <div className="lbl">{label}</div>
      <div className="val">
        {semaphore && <span className="dot" style={{ background: semaphore }} />}
        {value}
        {unit && <span className="unit"> {unit}</span>}
      </div>
    </div>
  );
}
