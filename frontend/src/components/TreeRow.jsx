import { useEffect, useRef } from "react";

export default function TreeRow({
  depth = 0,
  label,
  meta = null,
  icon = null,
  selected = false,
  descendantFocused = false,
  collapsible = false,
  isOpen = false,
  onToggle,
  onClick,
  onDoubleClick,
  onContextMenu,
  isMuted = false,
  editing = false,
  editorValue = "",
  editorAriaLabel,
  onEditorChange,
  onEditorCommit,
  onEditorCancel
}) {
  const inputRef = useRef(null);
  const skipCommitOnBlurRef = useRef(false);
  const itemClassName = `unity-tree-item ${selected ? "is-active" : ""} ${descendantFocused ? "is-descendant-focus" : ""} ${
    isMuted ? "is-muted" : ""
  } ${editing ? "is-editing" : ""}`;

  useEffect(() => {
    if (!editing || !inputRef.current) {
      return;
    }

    skipCommitOnBlurRef.current = false;
    inputRef.current.focus();
    inputRef.current.select();
  }, [editing]);

  return (
    <div className="unity-tree-line" style={{ paddingLeft: `${depth * 14}px` }}>
      {depth > 0 ? <span className="unity-tree-branch" aria-hidden="true" /> : null}
      {collapsible ? (
        <button
          type="button"
          className="unity-tree-expander"
          onClick={(event) => {
            event.stopPropagation();
            onToggle?.();
          }}
          aria-label={isOpen ? "접기" : "펼치기"}
        >
          {isOpen ? "▾" : "▸"}
        </button>
      ) : (
        <span className="unity-tree-expander is-placeholder" aria-hidden="true" />
      )}

      {editing ? (
        <div className={itemClassName} onContextMenu={onContextMenu}>
          {icon}
          <input
            ref={inputRef}
            type="text"
            className="unity-tree-inline-editor"
            value={editorValue}
            onChange={(event) => onEditorChange?.(event.target.value)}
            onBlur={() => {
              if (skipCommitOnBlurRef.current) {
                skipCommitOnBlurRef.current = false;
                onEditorCancel?.();
                return;
              }

              onEditorCommit?.();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                skipCommitOnBlurRef.current = false;
                event.currentTarget.blur();
                return;
              }

              if (event.key === "Escape") {
                event.preventDefault();
                skipCommitOnBlurRef.current = true;
                event.currentTarget.blur();
              }
            }}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            aria-label={editorAriaLabel ?? `${label} 이름 편집`}
          />
        </div>
      ) : (
        <button
          type="button"
          className={itemClassName}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        >
          {icon}
          <span className="unity-tree-label">{label}</span>
          {meta ? <span className="unity-tree-meta">{meta}</span> : null}
        </button>
      )}
    </div>
  );
}
