import {
  buildDeckSpotSceneSummaries,
  isDeckStudioSpotPlaced,
  resolveDeckStudioSelection,
  resolveDeckStudioSpotAssignmentPatch,
  resolveDeckStudioSpotUnassignmentPatch,
  prepareDeckStudioDraft,
  resolveDeckStudioSpotDropPatch,
  updateDeckStudioMetadata,
  updateDeckStudioSpot
} from "../model/deckStudioDraftModel";
import {
  openDeckStudioSpotWindow,
  pickAndSaveDeckStudioImage,
  reloadDeckStudioDraft
} from "../services/deckStudioService";

export function createDeckStudioController({
  actorId,
  canEdit,
  deckDraft,
  selection,
  setDeckDraft,
  setSelection,
  setPending,
  setMessage,
  setError,
  markPersistedDeckDraft,
  showReadOnlyError,
  openModal
}) {
  const activeDeckDraft = prepareDeckStudioDraft(deckDraft);

  function guardEditable() {
    if (canEdit) {
      return true;
    }

    showReadOnlyError?.();
    return false;
  }

  function applyLocalDraft(nextDeckDraft) {
    const preparedDeckDraft = prepareDeckStudioDraft(nextDeckDraft);

    if (!preparedDeckDraft) {
      return false;
    }

    setDeckDraft(preparedDeckDraft);
    return true;
  }

  function handleUpdateDeck(patch) {
    if (!guardEditable()) {
      return false;
    }

    return applyLocalDraft(updateDeckStudioMetadata(activeDeckDraft, patch));
  }

  function handleUpdateSpot(spotId, patch) {
    if (!guardEditable()) {
      return false;
    }

    return applyLocalDraft(updateDeckStudioSpot(activeDeckDraft, spotId, patch));
  }

  function handleMoveSpot(spotId, point) {
    return handleUpdateSpot(spotId, point);
  }

  function handleDropSpot(spotId, point) {
    if (!guardEditable()) {
      return false;
    }

    const patch = resolveDeckStudioSpotDropPatch(activeDeckDraft, spotId, point);

    if (!patch) {
      return false;
    }

    return handleUpdateSpot(spotId, patch);
  }

  function handleAssignSpot(spotId, point = null) {
    if (!guardEditable()) {
      return false;
    }

    const patch = resolveDeckStudioSpotAssignmentPatch(activeDeckDraft, spotId, point);

    if (!patch) {
      return false;
    }

    return handleUpdateSpot(spotId, patch);
  }

  function handleUnassignSpot(spotId) {
    if (!guardEditable()) {
      return false;
    }

    const targetSpot = (activeDeckDraft?.spots ?? []).find((spot) => spot.id === spotId) ?? null;

    if (!targetSpot || !isDeckStudioSpotPlaced(targetSpot)) {
      return false;
    }

    return handleUpdateSpot(spotId, resolveDeckStudioSpotUnassignmentPatch());
  }

  async function handleReloadDraft() {
    try {
      setPending(true);
      setError("");
      const payload = await reloadDeckStudioDraft({
        actorId,
        deckId: activeDeckDraft?.deckId ?? ""
      });
      const nextDeckDraft = prepareDeckStudioDraft(payload.deckDraft);
      markPersistedDeckDraft?.(nextDeckDraft);
      setDeckDraft(nextDeckDraft);
      setMessage("backend draft에서 Deck Studio를 다시 불러왔습니다.");
      return nextDeckDraft;
    } catch (reloadError) {
      setError(reloadError.message || "Deck Studio 초안을 다시 불러오지 못했습니다.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function handlePickImage() {
    if (!guardEditable()) {
      return null;
    }

    try {
      setPending(true);
      setError("");
      const payload = await pickAndSaveDeckStudioImage({
        actorId,
        deckId: activeDeckDraft?.deckId ?? ""
      });

      if (!payload) {
        return null;
      }

      const nextDeckDraft = prepareDeckStudioDraft(payload.deckDraft);
      markPersistedDeckDraft?.(nextDeckDraft);
      setDeckDraft(nextDeckDraft);
      setMessage(payload.message ?? "Deck 이미지를 저장했습니다.");
      return {
        ...payload,
        deckDraft: nextDeckDraft
      };
    } catch (pickError) {
      setError(pickError.message || "Deck 이미지를 저장하지 못했습니다.");
      return null;
    } finally {
      setPending(false);
    }
  }

  function handleOpenSpotStudio(spotId) {
    openDeckStudioSpotWindow({
      actorId,
      deckId: activeDeckDraft?.deckId ?? "",
      spotId
    });
  }

  return {
    deckDraft: activeDeckDraft,
    spotSceneSummaries: buildDeckSpotSceneSummaries(activeDeckDraft?.spots ?? []),
    ...resolveDeckStudioSelection(activeDeckDraft, selection),
    handleUpdateDeck,
    handleUpdateSpot,
    handleMoveSpot,
    handleDropSpot,
    handleAssignSpot,
    handleUnassignSpot,
    handleReloadDraft,
    handlePickImage,
    handleOpenSpotStudio
  };
}

export default createDeckStudioController;
