import {
  SPOT_STUDIO_AREA_COLOR,
  SPOT_STUDIO_EDGE_COLOR,
  SPOT_STUDIO_GROUP_COLOR,
  SPOT_STUDIO_WAYPOINT_COLOR
} from "../spotStudioColors";

const GROUP_COLOR_PALETTE = [
  SPOT_STUDIO_WAYPOINT_COLOR,
  SPOT_STUDIO_GROUP_COLOR,
  "#b4ada2",
  "#a69f94",
  "#8b857c",
  "#ece7dd"
];

function normalizeHexColor(value, fallback = GROUP_COLOR_PALETTE[0]) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
    return fallback;
  }

  if (normalized.length === 4) {
    return `#${normalized
      .slice(1)
      .split("")
      .map((token) => `${token}${token}`)
      .join("")}`;
  }

  return normalized;
}

function BulkOverlay({
  selectedWaypoints,
  selectedEdges,
  handleBulkCreateGroupAndAssign,
  handleBulkUngroup,
  handleBulkUpdateEdgeDirection,
  onBulkDelete
}) {
  const totalCount = selectedWaypoints.length + selectedEdges.length;
  const canGroup = totalCount > 0;
  const canUngroup = selectedWaypoints.length > 0 || selectedEdges.length > 0;
  const canChangeDirection = selectedEdges.length > 0;

  return (
    <div className="map-selection-overlay is-bulk-overlay">
      <div className="map-selection-overlay-header">
        <div className="map-selection-overlay-summary">
          <p className="map-selection-overlay-type" lang="en">
            MULTI SELECTION
          </p>
          <strong>{totalCount}개 항목 선택됨</strong>
          <small>
            Waypoint {selectedWaypoints.length} · Edge {selectedEdges.length}
          </small>
        </div>
        <div className="map-selection-badges">
          {selectedWaypoints.length ? <span>{selectedWaypoints.length} WP</span> : null}
          {selectedEdges.length ? <span>{selectedEdges.length} EDGE</span> : null}
        </div>
      </div>

      <div className="map-selection-tool-grid">
        {canGroup ? (
          <button
            type="button"
            className="ghost-button spot-toolbar-button map-selection-tool-button is-group"
            onClick={handleBulkCreateGroupAndAssign}
          >
            항목 그룹화
          </button>
        ) : null}
        {canUngroup ? (
          <button
            type="button"
            className="ghost-button spot-toolbar-button map-selection-tool-button is-ungroup"
            onClick={handleBulkUngroup}
          >
            항목 그룹 해제
          </button>
        ) : null}
        {canChangeDirection ? (
          <button
            type="button"
            className="ghost-button spot-toolbar-button map-selection-tool-button is-direction"
            onClick={() => handleBulkUpdateEdgeDirection("unidirectional")}
          >
            단방향
          </button>
        ) : null}
        {canChangeDirection ? (
          <button
            type="button"
            className="ghost-button spot-toolbar-button map-selection-tool-button is-direction"
            onClick={() => handleBulkUpdateEdgeDirection("bidirectional")}
          >
            양방향
          </button>
        ) : null}
        <button
          type="button"
          className="ghost-button spot-toolbar-button map-selection-tool-button is-danger"
          onClick={onBulkDelete}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

function GroupOverlay({
  activeWaypointGroup,
  waypointCount,
  edgeCount,
  handleRenameGroup,
  handleUpdateGroupColor,
  handleUpdateGroupTagOpacity,
  handleBulkUngroup
}) {
  const tagOpacity = Number(activeWaypointGroup.tagOpacity ?? 0.24);

  return (
    <div className="map-selection-overlay is-group-overlay">
      <div className="map-selection-overlay-header">
        <p className="map-selection-overlay-type" lang="en">
          GROUP
        </p>
        <div className="map-selection-badges">
          <span>{waypointCount} WP</span>
          <span>{edgeCount} EDGE</span>
        </div>
      </div>
      <div className="map-selection-overlay-summary">
        <strong>{activeWaypointGroup.name}</strong>
        <small>그룹 이름과 대표 색상을 바로 조정할 수 있습니다.</small>
      </div>
      <input
        className="inspector-input map-selection-input"
        type="text"
        value={activeWaypointGroup.name ?? ""}
        onChange={(event) => handleRenameGroup(activeWaypointGroup.id, event.target.value)}
      />
      <label className="map-selection-color-row">
        <span>Color</span>
        <input
          className="inspector-input is-color"
          type="color"
          value={activeWaypointGroup.color ?? SPOT_STUDIO_GROUP_COLOR}
          onChange={(event) => handleUpdateGroupColor(activeWaypointGroup.id, event.target.value)}
        />
      </label>
      <label className="map-selection-range-row">
        <span>Opacity</span>
        <input
          className="inspector-input inspector-range"
          type="range"
          min="0.08"
          max="0.85"
          step="0.01"
          value={tagOpacity}
          onChange={(event) => handleUpdateGroupTagOpacity(activeWaypointGroup.id, Number(event.target.value || 0.24))}
        />
        <small>{Math.round(tagOpacity * 100)}%</small>
      </label>
      {waypointCount > 0 || edgeCount > 0 ? (
        <div className="inline-action-group map-selection-overlay-actions is-compact map-selection-tool-row">
          <button
            type="button"
            className="ghost-button spot-toolbar-button map-selection-tool-button is-danger"
            onClick={handleBulkUngroup}
          >
            그룹 해제
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AreaOverlay({
  selectedArea,
  handleRenameArea,
  handleUpdateArea
}) {
  const areaColor = normalizeHexColor(selectedArea.color, SPOT_STUDIO_AREA_COLOR);
  const left = Math.round(selectedArea.x ?? 0);
  const top = Math.round(selectedArea.y ?? 0);
  const right = left + Math.round(selectedArea.width ?? 0);
  const bottom = top + Math.round(selectedArea.height ?? 0);

  return (
    <div className="map-selection-overlay is-area-overlay">
      <div className="map-selection-overlay-header">
        <p className="map-selection-overlay-type" lang="en">
          AREA
        </p>
        <div className="map-selection-badges">
          <span>{Math.round(selectedArea.width)} x {Math.round(selectedArea.height)}</span>
        </div>
      </div>
      <strong>{selectedArea.name}</strong>
      <input
        className="inspector-input map-selection-input"
        type="text"
        value={selectedArea.name ?? ""}
        onChange={(event) => handleRenameArea(selectedArea.id, event.target.value)}
      />
      <small>캔버스에서 드래그로 이동하고, 모서리 핸들로 크기를 조절할 수 있습니다.</small>
      <div className="map-selection-area-corners" aria-label="구역 네 모서리 좌표">
        <span>{`LT ${left},${top}`}</span>
        <span>{`RT ${right},${top}`}</span>
        <span>{`RB ${right},${bottom}`}</span>
        <span>{`LB ${left},${bottom}`}</span>
      </div>
      <label className="inspector-field">
        <span>Opacity</span>
        <input
          className="inspector-input"
          type="number"
          min="0.08"
          max="0.85"
          step="0.05"
          value={selectedArea.opacity ?? 0.18}
          onChange={(event) => handleUpdateArea(selectedArea.id, { opacity: Number(event.target.value || 0.18) })}
        />
      </label>
      <div className="studio-two-column">
        <label className="inspector-field">
          <span>X</span>
          <input
            className="inspector-input"
            type="number"
            value={Math.round(selectedArea.x ?? 0)}
            onChange={(event) => handleUpdateArea(selectedArea.id, { x: Number(event.target.value || 0) })}
          />
        </label>
        <label className="inspector-field">
          <span>Y</span>
          <input
            className="inspector-input"
            type="number"
            value={Math.round(selectedArea.y ?? 0)}
            onChange={(event) => handleUpdateArea(selectedArea.id, { y: Number(event.target.value || 0) })}
          />
        </label>
      </div>
      <div className="studio-two-column">
        <label className="inspector-field">
          <span>Width</span>
          <input
            className="inspector-input"
            type="number"
            min="48"
            value={Math.round(selectedArea.width ?? 48)}
            onChange={(event) => handleUpdateArea(selectedArea.id, { width: Number(event.target.value || 48) })}
          />
        </label>
        <label className="inspector-field">
          <span>Height</span>
          <input
            className="inspector-input"
            type="number"
            min="48"
            value={Math.round(selectedArea.height ?? 48)}
            onChange={(event) => handleUpdateArea(selectedArea.id, { height: Number(event.target.value || 48) })}
          />
        </label>
      </div>
      <label className="map-selection-color-row">
        <span>Color</span>
        <input
          className="inspector-input is-color"
          type="color"
          value={areaColor}
          onChange={(event) => handleUpdateArea(selectedArea.id, { color: event.target.value })}
        />
      </label>
    </div>
  );
}

export default function SpotSelectionOverlay({
  selectedEdge,
  selectedWaypoint,
  selectedArea,
  selectedWaypoints = [],
  selectedEdges = [],
  activeWaypointGroup,
  isGroupSelectionActive = false,
  effectiveSpot,
  getEdgeDisplayName,
  handleRenameEdge,
  handleUpdateSelectedEdgeDirection,
  handleBulkUpdateEdgeDirection,
  handleUpdateEdgeColor,
  handleRenameWaypoint,
  handleRenameArea,
  handleUpdateArea,
  waypointGroupNameById,
  handleBulkCreateGroupAndAssign,
  handleBulkUngroup,
  onBulkDelete,
  waypointColorById,
  groupColorById,
  handleUpdateWaypointColor,
  handleRenameGroup,
  handleUpdateGroupColor,
  handleUpdateGroupTagOpacity
}) {
  const hasMultiSelection = selectedWaypoints.length + selectedEdges.length > 1;

  if (activeWaypointGroup && isGroupSelectionActive) {
    const waypointCount = selectedWaypoints.filter(
      (waypoint) => waypoint.groupId === activeWaypointGroup.id
    ).length;
    const edgeCount = selectedEdges.filter((edge) => edge.groupId === activeWaypointGroup.id).length;

    return (
      <GroupOverlay
        activeWaypointGroup={activeWaypointGroup}
        waypointCount={waypointCount}
        edgeCount={edgeCount}
        handleRenameGroup={handleRenameGroup}
        handleUpdateGroupColor={handleUpdateGroupColor}
        handleUpdateGroupTagOpacity={handleUpdateGroupTagOpacity}
        handleBulkUngroup={handleBulkUngroup}
      />
    );
  }

  if (hasMultiSelection) {
    return (
        <BulkOverlay
          selectedWaypoints={selectedWaypoints}
          selectedEdges={selectedEdges}
          handleBulkCreateGroupAndAssign={handleBulkCreateGroupAndAssign}
          handleBulkUngroup={handleBulkUngroup}
          handleBulkUpdateEdgeDirection={handleBulkUpdateEdgeDirection}
          onBulkDelete={onBulkDelete}
        />
      );
  }

  if (selectedArea) {
    return (
      <AreaOverlay
        selectedArea={selectedArea}
        handleRenameArea={handleRenameArea}
        handleUpdateArea={handleUpdateArea}
      />
    );
  }

  if (selectedEdge) {
    return (
      <div className="map-selection-overlay">
        <p className="map-selection-overlay-type" lang="en">
          EDGE
        </p>
        <strong>{getEdgeDisplayName(selectedEdge)}</strong>
        <input
          className="inspector-input map-selection-input"
          type="text"
          value={selectedEdge.name ?? getEdgeDisplayName(selectedEdge)}
          onChange={(event) => handleRenameEdge(selectedEdge.id, event.target.value)}
        />
        <small>
          Direction: {selectedEdge.direction === "unidirectional" ? "Uni-direction" : "Bi-direction"}
        </small>
        <div className="inline-action-group map-selection-overlay-actions">
          <button
            type="button"
            className={`ghost-button spot-toolbar-button ${
              selectedEdge.direction === "unidirectional" ? "is-active-tool" : ""
            }`}
            onClick={() => handleUpdateSelectedEdgeDirection("unidirectional")}
          >
            UNI
          </button>
          <button
            type="button"
            className={`ghost-button spot-toolbar-button ${
              selectedEdge.direction === "bidirectional" ? "is-active-tool" : ""
            }`}
            onClick={() => handleUpdateSelectedEdgeDirection("bidirectional")}
          >
            BI
          </button>
        </div>
        <label className="map-selection-color-row">
          <span>Color</span>
          <input
            className="inspector-input is-color"
            type="color"
            value={selectedEdge.color ?? groupColorById.get(selectedEdge.groupId) ?? SPOT_STUDIO_EDGE_COLOR}
            onChange={(event) => handleUpdateEdgeColor(selectedEdge.id, event.target.value)}
          />
        </label>
      </div>
    );
  }

  if (selectedWaypoint) {
    return (
      <div className="map-selection-overlay">
        <p className="map-selection-overlay-type" lang="en">
          WAYPOINT
        </p>
        <strong>{selectedWaypoint.name}</strong>
        <input
          className="inspector-input map-selection-input"
          type="text"
          value={selectedWaypoint.name ?? ""}
          onChange={(event) => handleRenameWaypoint(selectedWaypoint.id, event.target.value)}
        />
        <small>
          Group: {waypointGroupNameById.get(selectedWaypoint.groupId) ?? "미지정"} · x{" "}
          {Math.round(selectedWaypoint.x)} / y {Math.round(selectedWaypoint.y)}
        </small>
        <label className="map-selection-color-row">
          <span>Color</span>
          <input
            className="inspector-input is-color"
            type="color"
            value={
              selectedWaypoint.color ?? waypointColorById.get(selectedWaypoint.id) ?? SPOT_STUDIO_WAYPOINT_COLOR
            }
            onChange={(event) => handleUpdateWaypointColor(selectedWaypoint.id, event.target.value)}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="map-selection-overlay">
      <p className="map-selection-overlay-type" lang="en">
        SPOT
      </p>
      <strong>{effectiveSpot?.name ?? "Spot"}</strong>
      <small>객체를 선택하면 상세 정보가 여기에 표시됩니다.</small>
    </div>
  );
}
