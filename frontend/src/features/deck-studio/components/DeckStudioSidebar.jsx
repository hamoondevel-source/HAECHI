import TreeRow from "../../../components/TreeRow";
import DeckStudioSidebarStatus from "./DeckStudioSidebarStatus";
import { resolveMapImageSrc } from "../../spot-studio/utils/mapCanvasViewport";
import { isDeckStudioSpotPlaced } from "../model/deckStudioDraftModel";

function handleSpotCardDragStart(event, spot) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(
    "application/x-haechi-deck-item",
    JSON.stringify({
      type: "spot",
      id: spot.id
    })
  );
}

function renderDeckSpotRowPreview(previewSrc) {
  return previewSrc ? (
    <span className="deck-spot-tree-preview has-image" aria-hidden="true">
      <img src={previewSrc} alt="" draggable={false} />
    </span>
  ) : (
    <span className="deck-spot-tree-preview is-empty" aria-hidden="true">
      <span className="deck-spot-tree-preview-fallback">SPT</span>
    </span>
  );
}

export default function DeckStudioSidebar({
  deckDraft,
  selection,
  spots = [],
  spotSceneSummaries,
  spotsCount = 0,
  pending = false,
  canEdit = false,
  message = "",
  error = "",
  onReload,
  onPickImage,
  onSelectSpot,
  onOpenSpotStudio,
  onSpotContextMenu
}) {
  return (
    <div className="studio-hierarchy-stack deck-studio-hierarchy-stack">
      <div className="deck-studio-sidebar-shell">
        <div className="unity-studio-panel-titlebar deck-studio-panel-titlebar">
          <div className="deck-panel-title-copy">
            <p className="section-label" lang="en">
              Hierarchy
            </p>
            <h2>Spot Library</h2>
          </div>
          <div className="deck-panel-title-actions">
            <button
              type="button"
              className="ghost-button spot-toolbar-button deck-sidebar-action"
              onClick={onReload}
              disabled={pending}
            >
              Sync
            </button>
            <button
              type="button"
              className="ghost-button spot-toolbar-button deck-sidebar-action"
              onClick={onPickImage}
              disabled={pending || !canEdit}
            >
              Map
            </button>
          </div>
        </div>

        <section className="studio-hierarchy-panel deck-spot-hierarchy-panel">
          <div className="unity-hierarchy-window">
            <div className="unity-hierarchy-root deck-hierarchy-root">
              <strong>{deckDraft.label} {deckDraft.name}</strong>
              <small>
                {spotsCount} spot results
                {deckDraft.image?.fileName ? ` · ${deckDraft.image.fileName}` : ""}
              </small>
            </div>

            <div className="unity-hierarchy-scroll">
              <div className="unity-tree-children deck-spot-tree">
                {spots.length ? (
                  spots.map((spot) => {
                  const previewSrc = resolveMapImageSrc(spot.image);
                  const isSelected = selection?.type === "spot" && selection.id === spot.id;
                  const isPlaced = isDeckStudioSpotPlaced(spot);
                  const sceneSummary = spotSceneSummaries?.get(spot.id);

                  return (
                    <TreeRow
                      key={spot.id}
                        depth={1}
                        label={spot.name}
                        title={
                          canEdit
                            ? `${spot.name} · drag to place · double click to open Spot Studio`
                            : spot.name
                        }
                        icon={renderDeckSpotRowPreview(previewSrc)}
                        meta={
                        <span className={`unity-tree-direction-badge ${isSelected ? "is-uni" : ""}`}>
                          {isPlaced ? `WP ${sceneSummary?.waypoints ?? 0} · E ${sceneSummary?.edges ?? 0}` : "UNASSIGNED"}
                        </span>
                      }
                      selected={isSelected}
                      isMuted={!isPlaced}
                      draggable={canEdit}
                      onDragStart={(event) => handleSpotCardDragStart(event, spot)}
                      onClick={() => onSelectSpot?.(spot.id)}
                      onDoubleClick={() => onOpenSpotStudio?.(spot.id)}
                      onContextMenu={(event) => onSpotContextMenu?.(event, spot.id)}
                    />
                  );
                })
                ) : (
                  <div className="unity-tree-empty">등록된 Spot이 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <DeckStudioSidebarStatus
        deckDraft={deckDraft}
        selection={selection}
        spots={spots}
        spotsCount={spotsCount}
        message={message}
        error={error}
      />
    </div>
  );
}
