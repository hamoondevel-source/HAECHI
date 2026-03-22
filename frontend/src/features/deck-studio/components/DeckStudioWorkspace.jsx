import { useState } from "react";
import DeckStudioToolbar from "./DeckStudioToolbar";
import MapCanvas from "../../spot-studio/components/canvas/MapCanvas";

export default function DeckStudioWorkspace({
  deckDraft,
  selection,
  spots,
  canEdit = false,
  setSelection,
  onOpenSpotStudio,
  onMoveSpot,
  onDropSpot,
  onViewportChange,
  onCanvasContextMenu
}) {
  const [isCanvasDropActive, setIsCanvasDropActive] = useState(false);

  function handleCanvasDropItem(payload, point) {
    setIsCanvasDropActive(false);

    if (payload?.type === "spot" && payload.id) {
      setSelection({ type: "spot", id: payload.id });
      onDropSpot?.(payload.id, point);
    }
  }

  return (
    <div className="studio-browser-panel deck-studio-browser-panel">
      <div className="unity-studio-panel-titlebar">
        <div className="unity-studio-panel-copy is-inline-spot-title deck-panel-title-copy">
          <p className="section-label" lang="en">
            Deck
          </p>
          <h2>{`${deckDraft.label} ${deckDraft.name}`}</h2>
        </div>
        <div className="studio-breadcrumbs">
          <span>{deckDraft.domainName}</span>
          <span>{deckDraft.label}</span>
          <span>{deckDraft.status}</span>
        </div>
      </div>

      <div className="unity-studio-panel-toolbarbar deck-studio-toolbarbar">
        <DeckStudioToolbar
          deckDraft={deckDraft}
          selection={selection}
          spots={spots}
          onSelectNode={setSelection}
          onOpenSpotStudio={onOpenSpotStudio}
        />
      </div>

      <section className="studio-preview-panel deck-studio-preview-panel">
        <MapCanvas
          deck={deckDraft}
          robots={[]}
          accessibleSpotIds={spots.map((spot) => spot.id)}
          selectedRobotId=""
          selectedNode={selection}
          onSelectSpot={(spot) => setSelection({ type: "spot", id: spot.id })}
          onMoveSpot={onMoveSpot}
          showSpots
          showNoGo={false}
          showDocks={false}
          interactive
          editable={canEdit}
          showMiniMap={false}
          onViewportChange={onViewportChange}
          showSpotEditorLayer={false}
          onCanvasContextMenu={onCanvasContextMenu}
          onCanvasBlankLeftClick={() => setSelection({ type: "deck", id: deckDraft.deckId })}
          onExternalDropItem={handleCanvasDropItem}
          onExternalDropActiveChange={setIsCanvasDropActive}
          lockToDeckScope
        />

        <div className={`deck-canvas-drop-hint ${isCanvasDropActive ? "is-active" : ""}`}>
          <strong>Drop Spot</strong>
          <small>좌측 hierarchy에서 Spot을 끌어와 deck 위에 놓으세요.</small>
        </div>
      </section>
    </div>
  );
}
