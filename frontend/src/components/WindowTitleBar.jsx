import { useEffect, useState } from "react";
import ActionModal from "./ActionModal";

function getDesktopBridge() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.haechiDesktop ?? null;
}

export default function WindowTitleBar({ title = "HAECHI Control Center" }) {
  const desktopBridge = getDesktopBridge();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  useEffect(() => {
    if (!desktopBridge?.isDesktop) {
      return undefined;
    }

    let unbind = null;
    let mounted = true;

    desktopBridge
      .isWindowMaximized?.()
      .then((response) => {
        if (mounted) {
          setIsMaximized(Boolean(response?.isMaximized));
        }
      })
      .catch(() => {});

    if (desktopBridge.onWindowMaximizedChange) {
      unbind = desktopBridge.onWindowMaximizedChange((nextMaximized) => {
        setIsMaximized(Boolean(nextMaximized));
      });
    }

    return () => {
      mounted = false;
      unbind?.();
    };
  }, [desktopBridge]);

  if (!desktopBridge?.isDesktop) {
    return null;
  }

  const closeConfirmModal = isCloseConfirmOpen
    ? {
        caption: "Window",
        title: "종료하시겠습니까?",
        description: "확인을 누르면 현재 창이 종료됩니다.",
        kind: "confirm",
        tone: "danger",
        confirmText: "종료",
        onConfirm: async () => {
          await desktopBridge.closeWindow?.();
        }
      }
    : null;

  return (
    <>
      <header className="window-titlebar">
        <div className="window-titlebar-drag">
          <span className="window-titlebar-title">{title}</span>
        </div>
        <div className="window-titlebar-controls">
          <button
            type="button"
            className="window-titlebar-button"
            aria-label="창 최소화"
            title="최소화"
            onClick={() => desktopBridge.minimizeWindow?.()}
          >
            <span className="is-minimize" />
          </button>
          <button
            type="button"
            className="window-titlebar-button"
            aria-label={isMaximized ? "창 복원" : "창 최대화"}
            title={isMaximized ? "복원" : "최대화"}
            onClick={async () => {
              const response = await desktopBridge.toggleMaximizeWindow?.();
              setIsMaximized(Boolean(response?.isMaximized));
            }}
          >
            <span className={isMaximized ? "is-restore" : "is-maximize"} />
          </button>
          <button
            type="button"
            className="window-titlebar-button is-close"
            aria-label="창 닫기"
            title="종료"
            onClick={() => setIsCloseConfirmOpen(true)}
          >
            <span className="is-close-glyph">×</span>
          </button>
        </div>
      </header>
      <ActionModal modal={closeConfirmModal} onClose={() => setIsCloseConfirmOpen(false)} />
    </>
  );
}
