import { useEffect, useState } from "react";
import { BsPencilSquare, BsTrash3 } from "react-icons/bs";

export default function ActionModal({ modal, onClose }) {
  const [value, setValue] = useState(modal?.initialValue ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(modal?.initialValue ?? "");
    setPending(false);
    setError("");
  }, [modal]);

  if (!modal) {
    return null;
  }

  const ModalIcon = modal.tone === "danger" ? BsTrash3 : BsPencilSquare;

  async function handleConfirm() {
    try {
      setPending(true);
      setError("");
      await modal.onConfirm?.(value);
      onClose();
    } catch (modalError) {
      setError(modalError.message || "작업을 완료하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="app-modal-backdrop" onMouseDown={onClose}>
      <div
        className="app-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="app-modal-head">
          <div className={`app-modal-icon-shell ${modal.tone === "danger" ? "is-danger" : ""}`}>
            <ModalIcon aria-hidden="true" />
          </div>
          <div className="app-modal-head-copy">
            <p className="section-label" lang="en">
              {modal.caption ?? "Action"}
            </p>
            <h2 id="app-modal-title">{modal.title}</h2>
          </div>
        </div>

        {modal.description ? <p className="app-modal-copy">{modal.description}</p> : null}

        {modal.kind === "input" ? (
          <label className="app-modal-form-field">
            <span className="app-modal-field-label">{modal.inputLabel ?? "이름"}</span>
            <input
              className="app-modal-field-input"
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={modal.placeholder ?? ""}
              autoFocus
            />
          </label>
        ) : null}

        {error ? (
          <div className="selection-strip is-alert">
            <strong className="selection-text is-alert">{error}</strong>
          </div>
        ) : null}

        <div className="app-modal-actions">
          <button type="button" className="ghost-button" onClick={onClose} disabled={pending}>
            {modal.cancelText ?? "취소"}
          </button>
          <button
            type="button"
            className={`primary-button ${modal.tone === "danger" ? "danger-button" : ""}`}
            onClick={handleConfirm}
            disabled={pending || (modal.kind === "input" && !value.trim())}
          >
            {pending ? modal.pendingText ?? "처리 중..." : modal.confirmText ?? "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
