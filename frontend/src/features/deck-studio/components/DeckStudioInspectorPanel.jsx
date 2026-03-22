import DetailItem from "../../../components/DetailItem";
import InspectorSection from "../../../components/InspectorSection";
import { normalizeSpotEditor } from "../../spot-studio/model/spotEditorModel";

export default function DeckStudioInspectorPanel({
  canEdit = true,
  pending = false,
  deckDraft,
  selectedSpot = null,
  onUpdateDeck,
  onUpdateSpot,
  onPickImage,
  onOpenSpotStudio
}) {
  const selectedSpotEditor = normalizeSpotEditor(selectedSpot?.editor);
  const selectionTitle = selectedSpot?.name ?? deckDraft?.name ?? "Deck";
  const selectionScope = selectedSpot ? "SPOT RESULT" : "DECK";

  return (
    <aside className="studio-inspector-panel unity-spot-inspector deck-studio-inspector-panel">
      <div className="unity-studio-panel-titlebar">
        <span className="unity-studio-panel-title" lang="en">
          Inspector
        </span>
        <span className="meta-pill" lang="en">
          DECK
        </span>
      </div>

      <div className="unity-spot-inspector-body">
        <div className="unity-inspector-object-header">
          <div className="deck-inspector-selection-copy">
            <p className="section-label" lang="en">
              Selection
            </p>
            <h2>{selectionTitle}</h2>
            <p className="deck-inspector-selection-kind" lang="en">
              {selectionScope} · {canEdit ? "edit" : "read-only"}
            </p>
          </div>
        </div>

        {selectedSpot ? (
          <>
            <InspectorSection title="Placement">
              <div className="detail-grid">
                <DetailItem label="Spot" value={selectedSpot.name ?? "-"} />
                <DetailItem label="Zone" value={selectedSpot.zoneKey ?? "-"} />
                <DetailItem label="Width" value={`${selectedSpot.width ?? 0}px`} />
                <DetailItem label="Height" value={`${selectedSpot.height ?? 0}px`} />
              </div>

              <div className="studio-two-column">
                <label className="inspector-field">
                  <span>X</span>
                  <input
                    className="inspector-input"
                    type="number"
                    value={selectedSpot.x ?? 0}
                    onChange={(event) => onUpdateSpot?.(selectedSpot.id, { x: Number(event.target.value || 0) })}
                    disabled={!canEdit}
                  />
                </label>
                <label className="inspector-field">
                  <span>Y</span>
                  <input
                    className="inspector-input"
                    type="number"
                    value={selectedSpot.y ?? 0}
                    onChange={(event) => onUpdateSpot?.(selectedSpot.id, { y: Number(event.target.value || 0) })}
                    disabled={!canEdit}
                  />
                </label>
              </div>
            </InspectorSection>

            <InspectorSection title="Spot Result">
              <div className="detail-grid">
                <DetailItem label="Image" value={selectedSpot.image?.fileName ?? "No image"} />
                <DetailItem label="Resolution" value={selectedSpot.calibration?.resolution ?? "-"} />
                <DetailItem label="Waypoints" value={selectedSpotEditor.waypoints.length} />
                <DetailItem label="Edges" value={selectedSpotEditor.edges.length} />
                <DetailItem label="Areas" value={selectedSpotEditor.zones.length} />
                <DetailItem
                  label="Origin"
                  value={
                    selectedSpot.calibration?.origin
                      ? `${Math.round(selectedSpot.calibration.origin.x)}, ${Math.round(selectedSpot.calibration.origin.y)}`
                      : "-"
                  }
                />
              </div>
              <div className="studio-inline-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onOpenSpotStudio?.(selectedSpot.id)}
                >
                  Spot Studio 열기
                </button>
              </div>
            </InspectorSection>
          </>
        ) : null}

        <InspectorSection title="Deck">
          <div className="studio-two-column">
            <label className="inspector-field">
              <span>Label</span>
              <input
                className="inspector-input"
                type="text"
                value={deckDraft.label ?? ""}
                onChange={(event) => onUpdateDeck?.({ label: event.target.value })}
                disabled={!canEdit}
              />
            </label>
            <label className="inspector-field">
              <span>Name</span>
              <input
                className="inspector-input"
                type="text"
                value={deckDraft.name ?? ""}
                onChange={(event) => onUpdateDeck?.({ name: event.target.value })}
                disabled={!canEdit}
              />
            </label>
          </div>

          <div className="studio-two-column">
            <label className="inspector-field">
              <span>Elevation</span>
              <input
                className="inspector-input"
                type="number"
                value={deckDraft.elevation ?? 0}
                onChange={(event) => onUpdateDeck?.({ elevation: Number(event.target.value || 0) })}
                disabled={!canEdit}
              />
            </label>
            <label className="inspector-field">
              <span>Deck Image</span>
              <button
                type="button"
                className="ghost-button"
                onClick={onPickImage}
                disabled={!canEdit || pending}
              >
                이미지 업로드
              </button>
            </label>
          </div>

          <div className="detail-grid">
            <DetailItem label="Image" value={deckDraft.image?.fileName ?? "No image"} />
            <DetailItem label="Canvas" value={`${deckDraft.image?.width ?? 1600} x ${deckDraft.image?.height ?? 900}`} />
            <DetailItem label="Spots" value={deckDraft.spots?.length ?? 0} />
            <DetailItem label="Deck Res." value={deckDraft.calibration?.resolution ?? 0.05} />
          </div>
        </InspectorSection>

        <InspectorSection title="Deck Resolution">
          <div className="studio-two-column">
            <label className="inspector-field">
              <span>Resolution</span>
              <input
                className="inspector-input"
                type="number"
                min="0.001"
                step="0.001"
                value={deckDraft.calibration?.resolution ?? 0.05}
                onChange={(event) =>
                  onUpdateDeck?.({
                    calibration: {
                      resolution: Math.max(0.001, Number(event.target.value || 0.05))
                    }
                  })
                }
                disabled={!canEdit}
              />
            </label>
            <label className="inspector-field">
              <span>Rotation</span>
              <input
                className="inspector-input"
                type="number"
                step="0.1"
                value={deckDraft.calibration?.rotation ?? 0}
                onChange={(event) =>
                  onUpdateDeck?.({
                    calibration: {
                      rotation: Number(event.target.value || 0)
                    }
                  })
                }
                disabled={!canEdit}
              />
            </label>
          </div>

          <div className="studio-two-column">
            <label className="inspector-field">
              <span>Origin X</span>
              <input
                className="inspector-input"
                type="number"
                value={deckDraft.calibration?.origin?.x ?? 240}
                onChange={(event) =>
                  onUpdateDeck?.({
                    calibration: {
                      origin: {
                        x: Number(event.target.value || 0)
                      }
                    }
                  })
                }
                disabled={!canEdit}
              />
            </label>
            <label className="inspector-field">
              <span>Origin Y</span>
              <input
                className="inspector-input"
                type="number"
                value={deckDraft.calibration?.origin?.y ?? 640}
                onChange={(event) =>
                  onUpdateDeck?.({
                    calibration: {
                      origin: {
                        y: Number(event.target.value || 0)
                      }
                    }
                  })
                }
                disabled={!canEdit}
              />
            </label>
          </div>

          <div className="studio-two-column">
            <label className="inspector-field">
              <span>Grid Meters</span>
              <input
                className="inspector-input"
                type="number"
                min="0.1"
                step="0.1"
                value={deckDraft.calibration?.gridMeters ?? 1}
                onChange={(event) =>
                  onUpdateDeck?.({
                    calibration: {
                      gridMeters: Math.max(0.1, Number(event.target.value || 1))
                    }
                  })
                }
                disabled={!canEdit}
              />
            </label>
            <label className="inspector-field">
              <span>Grid Count</span>
              <input
                className="inspector-input"
                type="number"
                min="4"
                max="120"
                step="1"
                value={deckDraft.calibration?.gridCount ?? 20}
                onChange={(event) =>
                  onUpdateDeck?.({
                    calibration: {
                      gridCount: Math.min(120, Math.max(4, Number(event.target.value || 20)))
                    }
                  })
                }
                disabled={!canEdit}
              />
            </label>
          </div>

          <p className="deck-inspector-helper">
            Deck 이미지를 먼저 맞추고, 좌측 Spot 결과를 드래그해 deck 좌표계 위에 배치하세요. Spot 크기는 각 Spot의
            해상도를 Deck resolution에 맞춰 자동 정렬합니다.
          </p>
        </InspectorSection>
      </div>
    </aside>
  );
}
