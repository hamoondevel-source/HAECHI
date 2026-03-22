import { updateDeckSpot, updateDeckSpotEditor } from "../spot-studio/model/spotEditorModel";

export function createDesktopStudioDeckController({
  deckDraft,
  isSpotStudio,
  setDeckDraft,
  setSelection
}) {
  function updateSpotEditor(spotId, updater) {
    const result = updateDeckSpotEditor(deckDraft, spotId, updater);

    if (!result.foundSpot) {
      return false;
    }

    setDeckDraft(result.deckDraft);

    if (isSpotStudio) {
      setSelection({ type: "spot", id: spotId });
    }

    return true;
  }

  function updateSpot(spotId, patch) {
    const result = updateDeckSpot(deckDraft, spotId, patch);

    if (!result.foundSpot) {
      return false;
    }

    setDeckDraft(result.deckDraft);
    return true;
  }

  return {
    updateSpotEditor,
    updateSpot
  };
}

export default createDesktopStudioDeckController;
