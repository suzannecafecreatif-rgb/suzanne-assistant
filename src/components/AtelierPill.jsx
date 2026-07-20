export default function AtelierPill({ atelier, onDragStart, onClick }) {
  return (
    <div className="atelier-pill" draggable onDragStart={onDragStart} onClick={onClick}>
      <span className="atelier-pill-theme">{atelier.theme}</span>
      <span className="atelier-pill-meta">{atelier.participants || 0} pers.</span>
    </div>
  );
}
