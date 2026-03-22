import {
  createStudioDeckItem,
  deleteStudioDeckItem,
  loadStudioDeckDraft,
  saveStudioDeckDraft,
  saveStudioDeckImage
} from "../services/mapStudioApi";
import { pickImageFile } from "../services/desktopShellService";

export async function loadDesktopStudioDocument({ actorId, deckId }) {
  return loadStudioDeckDraft({ actorId, deckId });
}

export async function saveDesktopStudioDocument({ actorId, deckDraft }) {
  return saveStudioDeckDraft({ actorId, deckDraft });
}

export async function pickAndSaveDesktopStudioImage({
  actorId,
  deckId,
  spotId = ""
}) {
  const pickedFile = await pickImageFile();

  if (!pickedFile) {
    return null;
  }

  return saveStudioDeckImage({
    actorId,
    deckId,
    spotId,
    pickedFile
  });
}

export async function createDesktopStudioItem({ actorId, deckId, kind }) {
  return createStudioDeckItem({ actorId, deckId, kind });
}

export async function deleteDesktopStudioItem({
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
