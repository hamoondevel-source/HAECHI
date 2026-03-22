import { useEffect, useState } from "react";
import DeckStudioContextMenu from "./DeckStudioContextMenu";
import DeckStudioInspectorPanel from "./DeckStudioInspectorPanel";
import DeckStudioSidebar from "./DeckStudioSidebar";
import DeckStudioWorkspace from "./DeckStudioWorkspace";
import createDeckStudioController from "../controllers/deckStudioController";

export default function DeckStudioScreen({
  actorId = "",
  canEdit = false,
  pending = false,
  message = "",
  error = "",
  deckDraft,
  selection,
  setDeckDraft,
  setSelection,
  setPending,
  setMessage,
  setError,
  markPersistedDeckDraft,
  showReadOnlyError,
  openModal,
  onViewportChange
}) {
  const [deckContextMenu, setDeckContextMenu] = useState(null);
  const deckStudioController = createDeckStudioController({
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
  });
  const resolvedDeckDraft = deckStudioController.deckDraft ?? deckDraft;

  useEffect(() => {
    if (resolvedDeckDraft && resolvedDeckDraft !== deckDraft) {
      markPersistedDeckDraft?.(resolvedDeckDraft);
      setDeckDraft(resolvedDeckDraft);
    }
  }, [deckDraft, markPersistedDeckDraft, resolvedDeckDraft, setDeckDraft]);

  useEffect(() => {
    if (!deckContextMenu) {
      return undefined;
    }

    function handleCloseMenu() {
      setDeckContextMenu(null);
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setDeckContextMenu(null);
      }
    }

    window.addEventListener("pointerdown", handleCloseMenu);
    window.addEventListener("resize", handleCloseMenu);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handleCloseMenu);
      window.removeEventListener("resize", handleCloseMenu);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [deckContextMenu]);

  function openDeckContextMenu(event, payload) {
    event.preventDefault();
    event.stopPropagation();

    if (payload?.spotId) {
      setSelection({ type: "spot", id: payload.spotId });
    }

    setDeckContextMenu({
      x: event.clientX,
      y: event.clientY,
      payload
    });
  }

  return (
    <>
      <aside className="studio-library-panel">
        <DeckStudioSidebar
          deckDraft={resolvedDeckDraft}
          selection={selection}
          spots={deckStudioController.spots}
          spotSceneSummaries={deckStudioController.spotSceneSummaries}
          spotsCount={deckStudioController.spots.length}
          pending={pending}
          canEdit={canEdit}
          message={message}
          error={error}
          onReload={deckStudioController.handleReloadDraft}
          onPickImage={deckStudioController.handlePickImage}
          onSelectSpot={(spotId) => setSelection({ type: "spot", id: spotId })}
          onOpenSpotStudio={deckStudioController.handleOpenSpotStudio}
          onSpotContextMenu={(event, spotId) => openDeckContextMenu(event, { type: "hierarchy-spot", spotId })}
        />
      </aside>

      <DeckStudioWorkspace
        deckDraft={resolvedDeckDraft}
        selection={selection}
        spots={deckStudioController.spots}
        canEdit={canEdit}
        setSelection={setSelection}
        onOpenSpotStudio={deckStudioController.handleOpenSpotStudio}
        onMoveSpot={deckStudioController.handleMoveSpot}
        onDropSpot={deckStudioController.handleDropSpot}
        onViewportChange={onViewportChange}
        onCanvasContextMenu={openDeckContextMenu}
      />

      <DeckStudioInspectorPanel
        canEdit={canEdit}
        pending={pending}
        deckDraft={resolvedDeckDraft}
        selectedSpot={deckStudioController.selectedSpot}
        onUpdateDeck={deckStudioController.handleUpdateDeck}
        onUpdateSpot={deckStudioController.handleUpdateSpot}
        onPickImage={deckStudioController.handlePickImage}
        onOpenSpotStudio={deckStudioController.handleOpenSpotStudio}
      />

      <DeckStudioContextMenu
        canEdit={canEdit}
        menu={deckContextMenu}
        deckDraft={resolvedDeckDraft}
        selection={selection}
        onClose={() => setDeckContextMenu(null)}
        onAssignSpot={deckStudioController.handleAssignSpot}
        onUnassignSpot={deckStudioController.handleUnassignSpot}
        onOpenSpotStudio={deckStudioController.handleOpenSpotStudio}
      />
    </>
  );
}
