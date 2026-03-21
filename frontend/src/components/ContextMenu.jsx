function ContextMenuButton({ item, onClose }) {
  const className = `studio-context-menu-item ${item.tone === "danger" ? "is-danger" : ""}`;

  return (
    <button
      type="button"
      className={className}
      disabled={item.disabled}
      onClick={() => {
        if (item.disabled) {
          return;
        }

        if (item.closeFirst !== false) {
          onClose?.();
        }

        item.onSelect?.();

        if (item.closeFirst === false) {
          onClose?.();
        }
      }}
    >
      {item.icon ?? null}
      <span>{item.label}</span>
    </button>
  );
}

export default function ContextMenu({ x, y, items = [], onClose, className = "studio-context-menu" }) {
  const visibleItems = items.filter(Boolean).filter((item) => !item.hidden);

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div
      className={className}
      style={{ left: x, top: y }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {visibleItems.map((item) => (
        <ContextMenuButton
          key={item.key ?? `${item.label}-${item.tone ?? "default"}`}
          item={item}
          onClose={onClose}
        />
      ))}
    </div>
  );
}
