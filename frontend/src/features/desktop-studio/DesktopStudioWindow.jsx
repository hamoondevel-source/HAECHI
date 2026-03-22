import { useEffect, useState } from "react";
import ActionModal from "../../components/ActionModal";
import WindowTitleBar from "../../components/WindowTitleBar";
import DeckStudioScreen from "../deck-studio/components/DeckStudioScreen";
import MapCanvas from "../spot-studio/components/canvas/MapCanvas";
import SpotHierarchySidebar from "../spot-studio/components/hierarchy/SpotHierarchySidebar";
import SpotSelectionOverlay from "../spot-studio/components/canvas/SpotSelectionOverlay";
import SpotStudioContextMenu from "../spot-studio/components/chrome/SpotStudioContextMenu";
import SpotStudioInspectorPanel from "../spot-studio/components/chrome/SpotStudioInspectorPanel";
import SpotStudioToolbar from "../spot-studio/components/chrome/SpotStudioToolbar";
import {
  pickAndSaveDesktopStudioImage,
  saveDesktopStudioDocument
} from "./controllers/desktopStudioDocumentController";
import createDesktopStudioEdgeController from "./controllers/desktopStudioEdgeController";
import createDesktopStudioElementController from "./controllers/desktopStudioElementController";
import createDesktopStudioGroupController from "./controllers/desktopStudioGroupController";
import createDesktopStudioModalController from "./controllers/desktopStudioModalController";
import createDesktopStudioSelectionController from "./controllers/desktopStudioSelectionController";
import createDesktopStudioWorkspaceController from "./controllers/desktopStudioWorkspaceController";
import createDesktopStudioDeckController from "./desktopStudioDeckController";
import useDesktopStudioSession from "./hooks/useDesktopStudioSession";
import { getDesktopBridge } from "./services/desktopShellService";
import {
  SPOT_STUDIO_GROUP_COLOR,
  SPOT_STUDIO_WAYPOINT_COLOR
} from "../spot-studio/constants/spotStudioColors";
import {
  AREA_TYPE_OPTIONS,
  normalizeSpotEditor
} from "../spot-studio/model/spotEditorModel";

function DesktopStudioWindow({
  deckId,
  focusType = "deck",
  focusId = "",
  actorId = ""
}) {
  const desktopBridge = getDesktopBridge();
  const [isSelectionOverlayCollapsed, setIsSelectionOverlayCollapsed] = useState(false);
  const {
    isSpotStudio,
    deckDraft,
    canEdit,
    isDirty,
    selection,
    spotToolMode,
    activeWaypointGroupId,
    edgeDirectionMode,
    edgeLinkMode,
    spotLayerVisibility,
    selectedWaypointId,
    selectedEdgeId,
    selectedAreaId,
    edgeAnchorWaypointId,
    spotCanvasMenu,
    hierarchyOpen,
    pending,
    message,
    error,
    spotEditModal,
    hierarchySelectionKeys,
    hierarchyAnchorKey,
    setDeckDraft,
    setSelection,
    setSpotToolMode,
    setActiveWaypointGroupId,
    setEdgeDirectionMode,
    setEdgeLinkMode,
    setSpotLayerVisibility,
    setSelectedWaypointId,
    setSelectedEdgeId,
    setSelectedAreaId,
    setEdgeAnchorWaypointId,
    setSpotCanvasMenu,
    setHierarchyOpen,
    setMapViewportMeta,
    setPending,
    setMessage,
    setError,
    setSpotEditModal,
    setHierarchySelectionKeys,
    setHierarchyAnchorKey,
    markPersistedDeckDraft,
    showReadOnlyError,
    runEditableAction
  } = useDesktopStudioSession({
    actorId,
    deckId,
    focusType,
    focusId,
    desktopBridge
  });
  const { updateSpotEditor, updateSpot } = createDesktopStudioDeckController({
    deckDraft,
    isSpotStudio,
    setDeckDraft,
    setSelection
  });

  useEffect(() => {
    if (!canEdit || !isSpotStudio || !deckDraft || spotEditModal) {
      return undefined;
    }

    function handleHierarchyDeleteKey(event) {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      const targetElement = event.target;
      const editingElement =
        targetElement instanceof HTMLElement
          ? targetElement.closest("input, textarea, select, [contenteditable=\"true\"]")
          : null;

      if (editingElement) {
        return;
      }

      event.preventDefault();
      handleDeleteHierarchySelection();
    }

    window.addEventListener("keydown", handleHierarchyDeleteKey);
    return () => {
      window.removeEventListener("keydown", handleHierarchyDeleteKey);
    };
  }, [canEdit, deckDraft, isSpotStudio, spotEditModal, hierarchySelectionKeys, selectedWaypointId, selectedEdgeId, selectedAreaId]);

  useEffect(() => {
    if (!canEdit || !isSpotStudio || !deckDraft || spotEditModal || spotToolMode !== "edge") {
      return undefined;
    }

    function handleEdgeModeEscape(event) {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      const targetElement = event.target;
      const editingElement =
        targetElement instanceof HTMLElement
          ? targetElement.closest("input, textarea, select, [contenteditable=\"true\"]")
          : null;

      if (editingElement) {
        return;
      }

      event.preventDefault();
      handleStopEdgeToolMode();
    }

    window.addEventListener("keydown", handleEdgeModeEscape);
    return () => {
      window.removeEventListener("keydown", handleEdgeModeEscape);
    };
  }, [canEdit, deckDraft, isSpotStudio, spotEditModal, spotToolMode]);

  useEffect(() => {
    function handleSaveShortcut(event) {
      const pressedKey = typeof event.key === "string" ? event.key.toLowerCase() : "";
      const isSaveShortcut =
        pressedKey === "s" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;

      if (!isSaveShortcut) {
        return;
      }

      event.preventDefault();

      if (pending || !canEdit || !isDirty) {
        return;
      }

      handleSave();
    }

    window.addEventListener("keydown", handleSaveShortcut);
    return () => {
      window.removeEventListener("keydown", handleSaveShortcut);
    };
  }, [canEdit, handleSave, isDirty, pending]);

  if (!desktopBridge?.isDesktop) {
    return <div className="loading-panel is-error">Electron 데스크톱 환경이 아닙니다.</div>;
  }

  if (!deckDraft) {
    return (
      <div className="desktop-window-root is-desktop">
        <WindowTitleBar title="HAECHI Studio" />
        <div className="desktop-window-content screen-shell screen-dashboard desktop-studio-screen">
          <div className="loading-panel">{error || "Deck 초안을 준비하는 중입니다."}</div>
        </div>
      </div>
    );
  }

  const spots = deckDraft.spots ?? [];
  const selectedSpot =
    spots.find((spot) => selection.type === "spot" && spot.id === selection.id) ?? null;
  const effectiveSpot = selectedSpot ?? (spots.length === 1 ? spots[0] : null);
  const spotImage = effectiveSpot?.image ?? null;
  const activeCanvasImage = isSpotStudio ? spotImage ?? deckDraft.image ?? null : deckDraft.image ?? null;
  const effectiveCalibration = effectiveSpot?.calibration ?? deckDraft.calibration ?? null;
  const studioEyebrow = isSpotStudio ? "Spot Studio" : focusType === "domain" ? "Domain Studio" : "Deck Studio";
  const studioTitle = isSpotStudio ? effectiveSpot?.name ?? "Spot Studio" : `${deckDraft.label} ${deckDraft.name}`;
  const studioCopy = isSpotStudio
    ? "선택된 Spot의 원점, 해상도, 회전 값을 기준으로 단위 맵을 정밀 보정합니다."
    : `${deckDraft.domainName} backend draft에서 Spot Studio 결과를 불러와 Deck 배치와 Portal 연결을 조립합니다.`;
  const studioStatusCopy = canEdit
    ? isDirty
      ? "저장되지 않은 변경사항이 있습니다."
      : "backend draft와 동기화된 상태입니다."
    : "읽기 전용 Studio입니다. ROOT 권한에서만 편집할 수 있습니다.";
  const studioSaveLabel = !canEdit ? "읽기 전용" : isDirty ? "저장" : "저장됨";
  const effectiveSpotEditor = normalizeSpotEditor(effectiveSpot?.editor);
  const waypointGroupCounts = effectiveSpotEditor.waypointGroups.map((group) => ({
    ...group,
    count: effectiveSpotEditor.waypoints.filter((waypoint) => waypoint.groupId === group.id).length,
    edgeCount: effectiveSpotEditor.edges.filter((edge) => edge.groupId === group.id).length
  }));
  const waypointGroupNameById = new Map(
    effectiveSpotEditor.waypointGroups.map((group) => [group.id, group.name])
  );
  const groupColorById = new Map(
    effectiveSpotEditor.waypointGroups.map((group) => [group.id, group.color ?? SPOT_STUDIO_GROUP_COLOR])
  );
  const waypointDisplayNameById = new Map(
    effectiveSpotEditor.waypoints.map((waypoint, index) => [waypoint.id, `WP${index + 1}`])
  );
  const selectedWaypoint =
    effectiveSpotEditor.waypoints.find((waypoint) => waypoint.id === selectedWaypointId) ?? null;
  const selectedEdge =
    effectiveSpotEditor.edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const selectedArea =
    effectiveSpotEditor.zones.find((area) => area.id === selectedAreaId) ?? null;
  const selectedWaypointIds = hierarchySelectionKeys
    .filter((key) => key.startsWith("waypoint:"))
    .map((key) => key.slice("waypoint:".length));
  const selectedEdgeIds = hierarchySelectionKeys
    .filter((key) => key.startsWith("edge:"))
    .map((key) => key.slice("edge:".length));
  const selectedWaypoints = effectiveSpotEditor.waypoints.filter((waypoint) =>
    selectedWaypointIds.includes(waypoint.id)
  );
  const selectedEdges = effectiveSpotEditor.edges.filter((edge) => selectedEdgeIds.includes(edge.id));
  const activeWaypointGroup =
    effectiveSpotEditor.waypointGroups.find((group) => group.id === activeWaypointGroupId) ?? null;
  const isGroupSelectionActive = Boolean(
    activeWaypointGroupId && hierarchySelectionKeys.includes(`group:${activeWaypointGroupId}`)
  );
  const waypointColorById = new Map(
    effectiveSpotEditor.waypoints.map((waypoint) => [
      waypoint.id,
      waypoint.color ??
        waypointGroupCounts.find((group) => group.id === waypoint.groupId)?.color ??
        SPOT_STUDIO_WAYPOINT_COLOR
    ])
  );
  const hierarchyGroupKeys = waypointGroupCounts.map((group) => `group:${group.id}`);
  const hierarchyWaypointKeys = effectiveSpotEditor.waypoints.map((waypoint) => `waypoint:${waypoint.id}`);
  const hierarchyEdgeKeys = effectiveSpotEditor.edges.map((edge) => `edge:${edge.id}`);

  function getEdgeDisplayName(edge) {
    if (!edge) {
      return "";
    }

    const fromLabel = waypointDisplayNameById.get(edge.from) ?? edge.from;
    const toLabel = waypointDisplayNameById.get(edge.to) ?? edge.to;
    return `${fromLabel} - ${toLabel}`;
  }

  const edgeController = createDesktopStudioEdgeController({
    effectiveSpot,
    edgeDirectionMode,
    updateSpotEditor,
    setSpotToolMode,
    setEdgeLinkMode,
    setSelectedWaypointId,
    setSelectedEdgeId,
    setEdgeAnchorWaypointId,
    setMessage,
    setError
  });

  const selectionController = createDesktopStudioSelectionController({
    effectiveSpot,
    effectiveSpotEditor,
    isSpotStudio,
    spotToolMode,
    edgeLinkMode,
    edgeDirectionMode,
    activeWaypointGroupId,
    hierarchySelectionKeys,
    hierarchyAnchorKey,
    selectedAreaId,
    selectedWaypointId,
    selectedEdgeId,
    edgeAnchorWaypointId,
    updateSpotEditor,
    handleAddEdge: (...args) => edgeController.handleAddEdge(...args),
    setSelectedAreaId,
    setActiveWaypointGroupId,
    setSelectedWaypointId,
    setSelectedEdgeId,
    setEdgeAnchorWaypointId,
    setHierarchySelectionKeys,
    setHierarchyAnchorKey,
    setSpotCanvasMenu,
    setMessage,
    setError
  });

  const groupController = createDesktopStudioGroupController({
    effectiveSpot,
    effectiveSpotEditor,
    hierarchySelectionKeys,
    updateSpotEditor,
    setSelectedAreaId,
    setActiveWaypointGroupId,
    setSelectedWaypointId,
    setSelectedEdgeId,
    setHierarchySelectionKeys,
    setHierarchyAnchorKey,
    setMessage,
    setError
  });

  const workspaceController = createDesktopStudioWorkspaceController({
    actorId,
    deckId,
    deckDraft,
    canEdit,
    isSpotStudio,
    effectiveSpot,
    spotToolMode,
    hierarchySelectionKeys,
    saveDocument: saveDesktopStudioDocument,
    pickAndSaveImage: pickAndSaveDesktopStudioImage,
    updateSpot,
    setPending,
    setError,
    setMessage,
    setDeckDraft,
    onPersistedDeckDraft: markPersistedDeckDraft,
    setSpotToolMode,
    setEdgeLinkMode,
    setEdgeAnchorWaypointId,
    setHierarchyOpen,
    setSpotCanvasMenu,
    setSpotLayerVisibility
  });

  const elementController = createDesktopStudioElementController({
    effectiveSpot,
    effectiveSpotEditor,
    effectiveCalibration,
    activeCanvasImage,
    selectedWaypointId,
    selectedEdgeId,
    selectedAreaId,
    selectedEdge,
    selectedEdgeIds,
    activeWaypointGroupId,
    edgeAnchorWaypointId,
    updateSpotEditor,
    updateSpot,
    setSelectedAreaId,
    setSelectedWaypointId,
    setSelectedEdgeId,
    setActiveWaypointGroupId,
    setEdgeAnchorWaypointId,
    setHierarchySelectionKeys,
    setHierarchyAnchorKey,
    setMessage,
    setError
  });

  const modalController = createDesktopStudioModalController({
    effectiveSpotEditor,
    getEdgeDisplayName,
    setSpotEditModal,
    handleRenameWaypoint,
    handleRenameGroup,
    handleRenameEdge,
    handleRenameArea,
    handleDeleteWaypoint,
    handleDeleteGroup,
    handleDeleteEdge,
    handleDeleteArea
  });

  function isHierarchyItemSelected(type, id) {
    return selectionController.isHierarchyItemSelected(type, id);
  }

  function handleHierarchyItemClick(event, type, id, orderedKeys) {
    return selectionController.handleHierarchyItemClick(event, type, id, orderedKeys);
  }

  function handleDeleteHierarchySelection() {
    return runEditableAction(() => selectionController.handleDeleteHierarchySelection());
  }

  function handleAddWaypoint(position = null) {
    return runEditableAction(() => elementController.handleAddWaypoint(position));
  }

  function handleAssignWaypointGroup(waypointId, groupId) {
    return runEditableAction(() => groupController.handleAssignWaypointGroup(waypointId, groupId));
  }

  function handleBulkUngroup() {
    return runEditableAction(() => groupController.handleBulkUngroup());
  }

  function handleSelectGroup(groupId) {
    return selectionController.handleSelectGroup(groupId);
  }

  function handleMoveWaypointGroup(groupId, updates = []) {
    return runEditableAction(() => elementController.handleMoveWaypointGroup(groupId, updates));
  }

  function handleRenameWaypoint(waypointId, name) {
    return runEditableAction(() => elementController.handleRenameWaypoint(waypointId, name));
  }

  function handleRenameSpot(name) {
    return runEditableAction(() => elementController.handleRenameSpot(name));
  }

  function handleRenameGroup(groupId, name) {
    return runEditableAction(() => elementController.handleRenameGroup(groupId, name));
  }

  function handleDeleteGroup(groupId) {
    return runEditableAction(() => elementController.handleDeleteGroup(groupId));
  }

  function handleRenameEdge(edgeId, name) {
    return runEditableAction(() => elementController.handleRenameEdge(edgeId, name));
  }

  function handleDeleteEdge(edgeId) {
    return runEditableAction(() => elementController.handleDeleteEdge(edgeId));
  }

  function handleUpdateWaypointColor(waypointId, color) {
    return runEditableAction(() => elementController.handleUpdateWaypointColor(waypointId, color));
  }

  function handleUpdateEdgeColor(edgeId, color) {
    return runEditableAction(() => elementController.handleUpdateEdgeColor(edgeId, color));
  }

  function handleUpdateGroupColor(groupId, color) {
    return runEditableAction(() => elementController.handleUpdateGroupColor(groupId, color));
  }

  function handleUpdateGroupTagOpacity(groupId, tagOpacity) {
    return runEditableAction(() => elementController.handleUpdateGroupTagOpacity(groupId, tagOpacity));
  }

  function handleAddArea(kind = "custom", position = null) {
    return runEditableAction(() => elementController.handleAddArea(kind, position));
  }

  function handleSelectArea(areaId) {
    return selectionController.handleSelectArea(areaId);
  }

  function handleRenameArea(areaId, name) {
    return runEditableAction(() => elementController.handleRenameArea(areaId, name));
  }

  function handleUpdateArea(areaId, patch) {
    return runEditableAction(() => elementController.handleUpdateArea(areaId, patch));
  }

  function handleDeleteArea(areaId) {
    return runEditableAction(() => elementController.handleDeleteArea(areaId));
  }

  function handleDeleteWaypoint(waypointId) {
    return runEditableAction(() => elementController.handleDeleteWaypoint(waypointId));
  }

  function handleAddEdge(
    fromWaypointId = null,
    toWaypointId = null,
    direction = "bidirectional",
    options = {}
  ) {
    return runEditableAction(() => edgeController.handleAddEdge(fromWaypointId, toWaypointId, direction, options));
  }

  function handleStartEdgeChain(waypointId) {
    return runEditableAction(() => edgeController.handleStartEdgeChain(waypointId));
  }

  function handleEndEdgeChain(chainWaypointIds = []) {
    return runEditableAction(() => edgeController.handleEndEdgeChain(chainWaypointIds));
  }

  function handleMoveWaypoint(waypointId, point) {
    return runEditableAction(() => elementController.handleMoveWaypoint(waypointId, point));
  }

  function handleMoveWaypoints(updates = []) {
    return runEditableAction(() => elementController.handleMoveWaypoints(updates));
  }

  function handleMoveArea(areaId, point) {
    return runEditableAction(() => elementController.handleMoveArea(areaId, point));
  }

  function handleResizeArea(areaId, patch) {
    return runEditableAction(() => elementController.handleResizeArea(areaId, patch));
  }

  function handleSelectEdge(edgeId) {
    return selectionController.handleSelectEdge(edgeId);
  }

  function handleUpdateSelectedEdgeDirection(direction) {
    return runEditableAction(() => elementController.handleUpdateSelectedEdgeDirection(direction));
  }

  function handleBulkUpdateEdgeDirection(direction) {
    return runEditableAction(() => elementController.handleBulkUpdateEdgeDirection(direction));
  }

  function openSpotEditModal(modalConfig) {
    return modalController.openSpotEditModal(modalConfig);
  }

  function openRenameWaypointModal(waypointId) {
    return modalController.openRenameWaypointModal(waypointId);
  }

  function openRenameGroupModal(groupId) {
    return modalController.openRenameGroupModal(groupId);
  }

  function openRenameEdgeModal(edgeId) {
    return modalController.openRenameEdgeModal(edgeId);
  }

  function openRenameAreaModal(areaId) {
    return modalController.openRenameAreaModal(areaId);
  }

  function openDeleteWaypointModal(waypointId) {
    return modalController.openDeleteWaypointModal(waypointId);
  }

  function openDeleteGroupModal(groupId) {
    return modalController.openDeleteGroupModal(groupId);
  }

  function openDeleteEdgeModal(edgeId) {
    return modalController.openDeleteEdgeModal(edgeId);
  }

  function openDeleteAreaModal(areaId) {
    return modalController.openDeleteAreaModal(areaId);
  }

  function handleWaypointSelection(waypointId) {
    return selectionController.handleWaypointSelection(waypointId);
  }

  function handleFocusWaypoint(waypointId) {
    return selectionController.handleFocusWaypoint(waypointId);
  }

  function handleSpotCanvasContextMenu(event, payload = null) {
    return workspaceController.handleSpotCanvasContextMenu(event, payload);
  }

  function handleCanvasMarqueeSelect({ waypointIds = [], edgeIds = [] } = {}) {
    return selectionController.handleCanvasMarqueeSelect({ waypointIds, edgeIds });
  }

  function handleClearCanvasSelection() {
    return selectionController.handleClearCanvasSelection();
  }

  function handleBulkAssignGroup(groupId) {
    return runEditableAction(() => groupController.handleBulkAssignGroup(groupId));
  }

  function handleBulkCreateGroupAndAssign() {
    return runEditableAction(() => groupController.handleBulkCreateGroupAndAssign());
  }

  function toggleHierarchySection(sectionKey) {
    return workspaceController.toggleHierarchySection(sectionKey);
  }

  function handleOriginPick(point) {
    return runEditableAction(() => workspaceController.handleOriginPick(point));
  }

  async function handleSave() {
    return runEditableAction(() => workspaceController.handleSave());
  }

  async function handlePickImage() {
    return runEditableAction(() => workspaceController.handlePickImage());
  }

  function handleToggleOriginToolMode() {
    return runEditableAction(() => workspaceController.handleToggleOriginToolMode());
  }

  function handleStopEdgeToolMode() {
    return workspaceController.handleStopEdgeToolMode();
  }

  function handleToggleEdgeToolMode() {
    return runEditableAction(() => workspaceController.handleToggleEdgeToolMode());
  }

  function handleChangeEdgeLinkMode(nextMode) {
    return runEditableAction(() => workspaceController.handleChangeEdgeLinkMode(nextMode));
  }

  function handleToggleSpotLayerVisibility(layerId) {
    return workspaceController.handleToggleSpotLayerVisibility(layerId);
  }

  return (
    <div className="desktop-window-root is-desktop">
      <WindowTitleBar title={`${studioTitle} · HAECHI Studio`} />
      <div className="desktop-window-content screen-shell screen-dashboard desktop-studio-screen">
        <section
          className={`panel-frame workspace-header desktop-studio-header ${
            isSpotStudio ? "is-spot-studio-header" : "is-deck-studio-header"
          }`}
        >
          <div className="desktop-studio-header-copy">
            <div className="desktop-studio-header-title-row">
              <p className="section-label" lang="en">
                {studioEyebrow}
              </p>
              <h1 title={studioTitle}>{studioTitle}</h1>
            </div>
            <div className="desktop-studio-header-meta-row">
              <p className="topbar-copy" title={studioCopy}>
                {studioCopy}
              </p>
              <p
                className={`studio-header-status ${canEdit ? (isDirty ? "is-dirty" : "is-synced") : "is-readonly"}`}
                title={studioStatusCopy}
              >
                {studioStatusCopy}
              </p>
            </div>
          </div>

          <div className="workspace-header-side">
            <button
              type="button"
              className="primary-button studio-header-save-button"
              onClick={handleSave}
              disabled={pending || !canEdit || !isDirty}
              title="Ctrl+S / Cmd+S"
            >
              {studioSaveLabel}
            </button>
          </div>
        </section>

      <section
        className={`panel-frame studio-shell desktop-studio-shell ${isSpotStudio ? "is-spot-studio" : "is-deck-studio"}`}
      >
        {isSpotStudio ? (
          <>
            <aside className="studio-library-panel">
            <SpotHierarchySidebar
              canEdit={canEdit}
              handleSpotCanvasContextMenu={handleSpotCanvasContextMenu}
              effectiveSpot={effectiveSpot}
              activeCanvasImage={activeCanvasImage}
              hierarchyOpen={hierarchyOpen}
              toggleHierarchySection={toggleHierarchySection}
              effectiveSpotEditor={effectiveSpotEditor}
              waypointGroupCounts={waypointGroupCounts}
              areaTypeOptions={AREA_TYPE_OPTIONS}
              selectedAreaId={selectedAreaId}
              isHierarchyItemSelected={isHierarchyItemSelected}
              handleHierarchyItemClick={handleHierarchyItemClick}
              handleSelectArea={handleSelectArea}
              hierarchyGroupKeys={hierarchyGroupKeys}
              hierarchyWaypointKeys={hierarchyWaypointKeys}
              hierarchyEdgeKeys={hierarchyEdgeKeys}
              activeWaypointGroup={activeWaypointGroup}
              waypointGroupNameById={waypointGroupNameById}
              getEdgeDisplayName={getEdgeDisplayName}
              waypointDisplayNameById={waypointDisplayNameById}
              hierarchySelectionKeys={hierarchySelectionKeys}
              handleRenameSpot={handleRenameSpot}
              handleRenameGroup={handleRenameGroup}
              handleRenameWaypoint={handleRenameWaypoint}
              handleRenameArea={handleRenameArea}
              message={message}
              error={error}
            />
            </aside>

            <div className="studio-browser-panel is-spot-workspace">
              <div className="unity-studio-panel-titlebar">
                <div className="unity-studio-panel-copy is-inline-spot-title">
                  <p className="section-label" lang="en">
                    Scene
                  </p>
                  <h2>{effectiveSpot?.name ?? deckDraft.name}</h2>
                </div>
                <div className="studio-breadcrumbs">
                  <span>{deckDraft.domainName}</span>
                  <span>{deckDraft.label}</span>
                  {effectiveSpot ? <span>{effectiveSpot.name}</span> : <span>{deckDraft.status}</span>}
                </div>
              </div>

              <div className="unity-studio-panel-toolbarbar">
                <SpotStudioToolbar
                  canEdit={canEdit}
                  spots={spots}
                  effectiveSpotId={effectiveSpot?.id ?? ""}
                  onSelectSpot={(spotId) => setSelection({ type: "spot", id: spotId })}
                  onPickImage={handlePickImage}
                  pending={pending}
                  spotToolMode={spotToolMode}
                  onToggleOriginMode={handleToggleOriginToolMode}
                  onToggleEdgeMode={handleToggleEdgeToolMode}
                  edgeDirectionMode={edgeDirectionMode}
                  onChangeEdgeDirectionMode={setEdgeDirectionMode}
                  edgeLinkMode={edgeLinkMode}
                  onChangeEdgeLinkMode={handleChangeEdgeLinkMode}
                />
              </div>

              <section className="studio-preview-panel">
                <MapCanvas
                  deck={deckDraft}
                  robots={[]}
                  accessibleSpotIds={spots.map((spot) => spot.id)}
                  selectedRobotId=""
                  selectedNode={selection}
                  onCanvasClick={handleOriginPick}
                  onSelectSpot={(spot) => setSelection({ type: "spot", id: spot.id })}
                  onSelectNoGo={(zone) => setSelection({ type: "nogo", id: zone.id })}
                  onSelectDock={(dock) => setSelection({ type: "dock", id: dock.id })}
                  showSpots={false}
                  showNoGo={false}
                  showDocks={false}
                  interactive
                  editable={canEdit}
                  originPlacementMode={spotToolMode === "origin"}
                  showMiniMap
                  onViewportChange={setMapViewportMeta}
                  spotEditorData={effectiveSpotEditor}
                  showSpotEditorLayer
                  spotLayerVisibility={spotLayerVisibility}
                  onToggleSpotLayerVisibility={handleToggleSpotLayerVisibility}
                  edgeCreateMode={spotToolMode === "edge"}
                  edgeDirectionMode={edgeDirectionMode}
                  edgeLinkMode={edgeLinkMode}
                  selectedWaypointId={selectedWaypointId}
                  selectedEdgeId={selectedEdgeId}
                  selectedAreaId={selectedAreaId}
                  selectedWaypointIds={hierarchySelectionKeys
                    .filter((key) => key.startsWith("waypoint:"))
                    .map((key) => key.slice("waypoint:".length))}
                  selectedEdgeIds={hierarchySelectionKeys
                    .filter((key) => key.startsWith("edge:"))
                    .map((key) => key.slice("edge:".length))}
                  activeWaypointGroup={activeWaypointGroup}
                  isGroupSelectionActive={isGroupSelectionActive}
                  edgeAnchorWaypointId={edgeAnchorWaypointId}
                  onSelectWaypoint={handleWaypointSelection}
                  onFocusWaypoint={handleFocusWaypoint}
                  onSelectEdge={handleSelectEdge}
                  onSelectArea={handleSelectArea}
                  onSelectGroup={handleSelectGroup}
                  onMoveWaypoint={handleMoveWaypoint}
                  onMoveWaypoints={handleMoveWaypoints}
                  onMoveWaypointGroup={handleMoveWaypointGroup}
                  onMoveArea={handleMoveArea}
                  onResizeArea={handleResizeArea}
                  onCanvasContextMenu={handleSpotCanvasContextMenu}
                  onEdgeChainStart={handleStartEdgeChain}
                  onEdgeChainEnd={handleEndEdgeChain}
                  onMarqueeSelect={handleCanvasMarqueeSelect}
                  onCanvasBlankLeftClick={handleClearCanvasSelection}
                />
                <SpotSelectionOverlay
                  canEdit={canEdit}
                  isCollapsed={isSelectionOverlayCollapsed}
                  onToggleCollapsed={() =>
                    setIsSelectionOverlayCollapsed((current) => !current)
                  }
                  selectedEdge={selectedEdge}
                  selectedWaypoint={selectedWaypoint}
                  selectedArea={selectedArea}
                  selectedWaypoints={selectedWaypoints}
                  selectedEdges={selectedEdges}
                  activeWaypointGroup={activeWaypointGroup}
                  isGroupSelectionActive={isGroupSelectionActive}
                  effectiveSpot={effectiveSpot}
                  areaTypeOptions={AREA_TYPE_OPTIONS}
                  getEdgeDisplayName={getEdgeDisplayName}
                  handleRenameEdge={handleRenameEdge}
                  handleUpdateSelectedEdgeDirection={handleUpdateSelectedEdgeDirection}
                  handleBulkUpdateEdgeDirection={handleBulkUpdateEdgeDirection}
                  handleUpdateEdgeColor={handleUpdateEdgeColor}
                  handleRenameWaypoint={handleRenameWaypoint}
                  handleRenameArea={handleRenameArea}
                  handleUpdateArea={handleUpdateArea}
                  waypointGroupNameById={waypointGroupNameById}
                  handleBulkCreateGroupAndAssign={handleBulkCreateGroupAndAssign}
                  handleBulkUngroup={handleBulkUngroup}
                  onBulkDelete={handleDeleteHierarchySelection}
                  waypointGroups={effectiveSpotEditor.waypointGroups ?? []}
                  waypointColorById={waypointColorById}
                  groupColorById={groupColorById}
                  handleUpdateWaypointColor={handleUpdateWaypointColor}
                  handleRenameGroup={handleRenameGroup}
                  handleUpdateGroupColor={handleUpdateGroupColor}
                  handleUpdateGroupTagOpacity={handleUpdateGroupTagOpacity}
                />
              </section>
            </div>

            <SpotStudioInspectorPanel
              canEdit={canEdit}
              isSpotStudio={isSpotStudio}
              effectiveSpot={effectiveSpot}
              deckDraft={deckDraft}
              activeCanvasImage={activeCanvasImage}
              effectiveSpotEditor={effectiveSpotEditor}
              effectiveCalibration={effectiveCalibration}
              onUpdateCalibration={(patch) => {
                runEditableAction(() => {
                  if (!effectiveSpot) {
                    return;
                  }

                  updateSpot(effectiveSpot.id, {
                    calibration: patch
                  });
                });
              }}
              spotsCount={spots.length}
            />
          </>
        ) : (
          <DeckStudioScreen
            actorId={actorId}
            canEdit={canEdit}
            pending={pending}
            message={message}
            error={error}
            deckDraft={deckDraft}
            selection={selection}
            setDeckDraft={setDeckDraft}
            setSelection={setSelection}
            setPending={setPending}
            setMessage={setMessage}
            setError={setError}
            markPersistedDeckDraft={markPersistedDeckDraft}
            showReadOnlyError={showReadOnlyError}
            openModal={(modalConfig) => modalController.openSpotEditModal(modalConfig)}
            onViewportChange={setMapViewportMeta}
          />
        )}
      </section>

      {isSpotStudio && spotCanvasMenu ? (
        <SpotStudioContextMenu
          canEdit={canEdit}
          spotCanvasMenu={spotCanvasMenu}
          edgeAnchorWaypointId={edgeAnchorWaypointId}
          areaTypeOptions={AREA_TYPE_OPTIONS}
          onClose={() => setSpotCanvasMenu(null)}
          onAddWaypoint={handleAddWaypoint}
          onCreateArea={handleAddArea}
          onSwitchEdgeMode={() => {
            setSpotToolMode("edge");
            setMessage("간선 모드입니다. 웨이포인트에서 우클릭을 누른 채 드래그해 연속 연결하세요.");
            setError("");
          }}
          onClearEdgeAnchor={() => {
            setEdgeAnchorWaypointId("");
            setMessage("간선 시작점을 해제했습니다.");
            setError("");
          }}
          onExpandAllHierarchy={() =>
            setHierarchyOpen({
              groups: true,
              waypoints: true,
              edges: true
            })
          }
          onCollapseAllHierarchy={() =>
            setHierarchyOpen({
              groups: false,
              waypoints: false,
              edges: false
            })
          }
          onRenameWaypoint={openRenameWaypointModal}
          onDeleteWaypoint={openDeleteWaypointModal}
          onRenameGroup={openRenameGroupModal}
          onDeleteGroup={openDeleteGroupModal}
          onRenameArea={openRenameAreaModal}
          onDeleteArea={openDeleteAreaModal}
          onSelectEdge={handleSelectEdge}
          onRenameEdge={openRenameEdgeModal}
          onDeleteEdge={openDeleteEdgeModal}
          onBulkCreateGroupAndAssign={handleBulkCreateGroupAndAssign}
          onBulkUngroup={handleBulkUngroup}
          onBulkDelete={handleDeleteHierarchySelection}
        />
      ) : null}
      <ActionModal modal={spotEditModal} onClose={() => setSpotEditModal(null)} />
      </div>
    </div>
  );
}

export default DesktopStudioWindow;
