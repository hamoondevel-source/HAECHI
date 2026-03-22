import { BsChevronDown, BsChevronUp } from "react-icons/bs";
import {
  AreaSelectionPanel,
  BulkSelectionPanel,
  EdgeSelectionPanel,
  GroupSelectionPanel,
  SpotSelectionPanel,
  WaypointSelectionPanel
} from "./spotSelectionOverlayPanels";

export default function SpotSelectionOverlay({
  canEdit = true,
  isCollapsed = false,
  onToggleCollapsed,
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
  let panelContent = null;
  let overlayKindClassName = "";
  let overlayMeta = {
    eyebrow: "INSPECTOR",
    title: effectiveSpot?.name ?? "Spot",
    detail: "객체를 선택하면 상세 정보가 여기에 표시됩니다."
  };

  if (activeWaypointGroup && isGroupSelectionActive) {
    const waypointCount = selectedWaypoints.filter(
      (waypoint) => waypoint.groupId === activeWaypointGroup.id
    ).length;
    const edgeCount = selectedEdges.filter((edge) => edge.groupId === activeWaypointGroup.id).length;

    panelContent = (
      <GroupSelectionPanel
        canEdit={canEdit}
        activeWaypointGroup={activeWaypointGroup}
        waypointCount={waypointCount}
        edgeCount={edgeCount}
        handleRenameGroup={handleRenameGroup}
        handleUpdateGroupColor={handleUpdateGroupColor}
        handleUpdateGroupTagOpacity={handleUpdateGroupTagOpacity}
        handleBulkUngroup={handleBulkUngroup}
      />
    );
    overlayKindClassName = "is-group-overlay";
    overlayMeta = {
      eyebrow: "GROUP",
      title: activeWaypointGroup.name ?? "Waypoint Group",
      detail: `Waypoint ${waypointCount} · Edge ${edgeCount}`
    };
  } else if (hasMultiSelection) {
    panelContent = (
      <BulkSelectionPanel
        canEdit={canEdit}
        selectedWaypoints={selectedWaypoints}
        selectedEdges={selectedEdges}
        handleBulkCreateGroupAndAssign={handleBulkCreateGroupAndAssign}
        handleBulkUngroup={handleBulkUngroup}
        handleBulkUpdateEdgeDirection={handleBulkUpdateEdgeDirection}
        onBulkDelete={onBulkDelete}
      />
    );
    overlayKindClassName = "is-bulk-overlay";
    overlayMeta = {
      eyebrow: "MULTI",
      title: `${selectedWaypoints.length + selectedEdges.length}개 선택`,
      detail: `Waypoint ${selectedWaypoints.length} · Edge ${selectedEdges.length}`
    };
  } else if (selectedArea) {
    panelContent = (
      <AreaSelectionPanel
        canEdit={canEdit}
        selectedArea={selectedArea}
        handleRenameArea={handleRenameArea}
        handleUpdateArea={handleUpdateArea}
      />
    );
    overlayMeta = {
      eyebrow: "AREA",
      title: selectedArea.name ?? "Area",
      detail: `${Math.round(selectedArea.width ?? 0)} x ${Math.round(selectedArea.height ?? 0)}`
    };
  } else if (selectedEdge) {
    panelContent = (
      <EdgeSelectionPanel
        canEdit={canEdit}
        selectedEdge={selectedEdge}
        getEdgeDisplayName={getEdgeDisplayName}
        handleRenameEdge={handleRenameEdge}
        handleUpdateSelectedEdgeDirection={handleUpdateSelectedEdgeDirection}
        handleUpdateEdgeColor={handleUpdateEdgeColor}
        groupColorById={groupColorById}
      />
    );
    overlayMeta = {
      eyebrow: "EDGE",
      title: getEdgeDisplayName(selectedEdge),
      detail:
        selectedEdge.direction === "unidirectional" ? "Uni-direction" : "Bi-direction"
    };
  } else if (selectedWaypoint) {
    panelContent = (
      <WaypointSelectionPanel
        canEdit={canEdit}
        selectedWaypoint={selectedWaypoint}
        handleRenameWaypoint={handleRenameWaypoint}
        waypointGroupNameById={waypointGroupNameById}
        waypointColorById={waypointColorById}
        handleUpdateWaypointColor={handleUpdateWaypointColor}
      />
    );
    overlayMeta = {
      eyebrow: "WAYPOINT",
      title: selectedWaypoint.name ?? "Waypoint",
      detail: `x ${Math.round(selectedWaypoint.x ?? 0)} · y ${Math.round(selectedWaypoint.y ?? 0)}`
    };
  } else {
    panelContent = <SpotSelectionPanel effectiveSpot={effectiveSpot} />;
    overlayMeta = {
      eyebrow: "SPOT",
      title: effectiveSpot?.name ?? "Spot",
      detail: "객체를 선택하면 상세 정보가 여기에 표시됩니다."
    };
  }

  return (
    <div
      className={`map-selection-overlay-shell ${overlayKindClassName} ${
        isCollapsed ? "is-collapsed" : ""
      }`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="map-selection-overlay-toggle"
        aria-expanded={!isCollapsed}
        onClick={onToggleCollapsed}
      >
        <span className="map-selection-overlay-toggle-copy">
          <span className="map-selection-overlay-toggle-label">{overlayMeta.eyebrow}</span>
          <strong>{overlayMeta.title}</strong>
          <small>{overlayMeta.detail}</small>
        </span>
        {isCollapsed ? <BsChevronDown aria-hidden="true" /> : <BsChevronUp aria-hidden="true" />}
      </button>

      <div className="map-selection-overlay-shell-body" aria-hidden={isCollapsed}>
        {panelContent}
      </div>
    </div>
  );
}
