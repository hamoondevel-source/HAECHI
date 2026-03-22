export function getDesktopBridge() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.haechiDesktop ?? null;
}

export async function pickImageFile() {
  const desktopBridge = getDesktopBridge();

  if (!desktopBridge?.isDesktop || typeof desktopBridge.pickImageFile !== "function") {
    throw new Error("Electron 데스크톱 환경에서만 이미지를 선택할 수 있습니다.");
  }

  return desktopBridge.pickImageFile();
}
