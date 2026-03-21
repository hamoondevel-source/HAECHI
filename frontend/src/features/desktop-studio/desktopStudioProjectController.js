import { updateProjectSpot, updateProjectSpotEditor } from "../spot-studio/spotEditorModel";

export function createDesktopStudioProjectController({
  project,
  isSpotStudio,
  setProject,
  setSelection
}) {
  function updateSpotEditor(spotId, updater) {
    const result = updateProjectSpotEditor(project, spotId, updater);

    if (!result.foundSpot) {
      return false;
    }

    setProject(result.project);

    if (isSpotStudio) {
      setSelection({ type: "spot", id: spotId });
    }

    return true;
  }

  function updateSpot(spotId, patch) {
    const result = updateProjectSpot(project, spotId, patch);

    if (!result.foundSpot) {
      return false;
    }

    setProject(result.project);
    return true;
  }

  return {
    updateSpotEditor,
    updateSpot
  };
}

export default createDesktopStudioProjectController;
