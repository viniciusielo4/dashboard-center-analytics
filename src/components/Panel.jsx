export default function Panel({ title, subtitle, span2, children }) {
  return (
    <div className={`panel${span2 ? " span2" : ""}`}>
      <h2>{title}</h2>
      <div className="sub">{subtitle}</div>
      {children}
    </div>
  );
}
