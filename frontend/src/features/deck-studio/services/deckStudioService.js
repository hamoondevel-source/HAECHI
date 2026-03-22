import { pickImageFile, getDesktopBridge } from "../../desktop-studio/services/desktopShellService";
import {
  createStudioDeckItem,
  deleteStudioDeckItem,
  loadStudioDeckDraft,
  saveStudioDeckImage
} from "../../desktop-studio/services/mapStudioApi";

export async function reloadDeckStudioDraft({ actorId, deckId }) {
  return loadStudioDeckDraft({ actorId, deckId });
}

export async function createDeckStudioItem({ actorId, deckId, kind }) {
  return createStudioDeckItem({ actorId, deckId, kind });
}

export async function deleteDeckStudioItem({
  actorId,
  deckId,
  itemType,
  itemId,
  dockKind = "dock"
}) {
  return deleteStudioDeckItem({
    actorId,
    deckId,
    itemType,
    itemId,
    dockKind
  });
}

export async function pickAndSaveDeckStudioImage({ actorId, deckId }) {
  const pickedFile = await pickImageFile();

  if (!pickedFile) {
    return null;
  }

  return saveStudioDeckImage({
    actorId,
    deckId,
    pickedFile
  });
}

export function openDeckStudioSpotWindow({ actorId, deckId, spotId }) {
  const desktopBridge = getDesktopBridge();

  if (!desktopBridge?.openStudioWindow || !deckId || !spotId) {
    return false;
  }

  desktopBridge.openStudioWindow({
    deckId,
    focusType: "spot",
    focusId: spotId,
    actorId
  });
  return true;
}
