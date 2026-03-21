import {
  BsCollectionFill,
  BsDiagram3Fill,
  BsFileEarmarkImageFill,
  BsGeoAltFill
} from "react-icons/bs";

export default function SpotStudioToolbar({
  spots,
  effectiveSpotId,
  onSelectSpot,
  onPickImage,
  pending,
  spotToolMode,
  onToggleOriginMode,
  onToggleEdgeMode,
  edgeDirectionMode,
  onChangeEdgeDirectionMode,
  edgeLinkMode,
  onChangeEdgeLinkMode
}) {
  const isEdgeMode = spotToolMode === "edge";

  function renderEdgeButton() {
    return (
      <button
        type="button"
        className={`ghost-button spot-toolbar-button ${spotToolMode === "edge" ? "is-active-tool" : ""}`}
        onClick={onToggleEdgeMode}
        disabled={!effectiveSpotId}
      >
        <BsDiagram3Fill className="spot-toolbar-icon" aria-hidden="true" />
        간선
      </button>
    );
  }

  return (
    <div className="studio-browser-actions spot-toolbar-actions">
      <div className="spot-toolbar-cluster">
        <label className="spot-toolbar-select-shell">
          <BsCollectionFill className="spot-toolbar-icon" aria-hidden="true" />
          <select
            className="inspector-input spot-toolbar-select"
            value={effectiveSpotId ?? ""}
            onChange={(event) => onSelectSpot(event.target.value)}
          >
            {(spots ?? []).map((spot) => (
              <option key={spot.id} value={spot.id}>
                {spot.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="spot-toolbar-cluster spot-toolbar-cluster-tools">
        {!isEdgeMode ? (
          <button type="button" className="ghost-button spot-toolbar-button" onClick={onPickImage} disabled={pending}>
            <BsFileEarmarkImageFill className="spot-toolbar-icon" aria-hidden="true" />
            맵
          </button>
        ) : null}

        {!isEdgeMode ? (
          <button
            type="button"
            className={`ghost-button spot-toolbar-button ${spotToolMode === "origin" ? "is-active-tool" : ""}`}
            onClick={onToggleOriginMode}
            disabled={!effectiveSpotId}
          >
            <BsGeoAltFill className="spot-toolbar-icon" aria-hidden="true" />
            원점
          </button>
        ) : null}

        {spotToolMode === "edge" ? (
          <div className="inline-action-group spot-direction-toggle">
            <button
              type="button"
              className={`ghost-button spot-toolbar-button ${
                edgeDirectionMode === "unidirectional" ? "is-active-tool" : ""
              }`}
              onClick={() => onChangeEdgeDirectionMode("unidirectional")}
            >
              UNI
            </button>
            <button
              type="button"
              className={`ghost-button spot-toolbar-button ${
                edgeDirectionMode === "bidirectional" ? "is-active-tool" : ""
              }`}
              onClick={() => onChangeEdgeDirectionMode("bidirectional")}
            >
              BI
            </button>
          </div>
        ) : null}

        {spotToolMode === "edge" ? (
          <div className="inline-action-group spot-direction-toggle">
            <button
              type="button"
              className={`ghost-button spot-toolbar-button ${edgeLinkMode === "single" ? "is-active-tool" : ""}`}
              onClick={() => onChangeEdgeLinkMode("single")}
            >
              SINGLE
            </button>
            <button
              type="button"
              className={`ghost-button spot-toolbar-button ${edgeLinkMode === "hold" ? "is-active-tool" : ""}`}
              onClick={() => onChangeEdgeLinkMode("hold")}
            >
              HOLD
            </button>
          </div>
        ) : null}

        {renderEdgeButton()}
      </div>
    </div>
  );
}
