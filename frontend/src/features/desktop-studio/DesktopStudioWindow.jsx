import { useEffect, useState } from "react";
import ActionModal from "../../components/ActionModal";
import WindowTitleBar from "../../components/WindowTitleBar";
import MapCanvas from "../spot-studio/components/MapCanvas";
import SpotHierarchySidebar from "../spot-studio/components/SpotHierarchySidebar";
import SpotSelectionOverlay from "../spot-studio/components/SpotSelectionOverlay";
import SpotStudioContextMenu from "../spot-studio/components/SpotStudioContextMenu";
import SpotStudioInspectorPanel from "../spot-studio/components/SpotStudioInspectorPanel";
import SpotStudioToolbar from "../spot-studio/components/SpotStudioToolbar";
import createDesktopStudioProjectController from "./desktopStudioProjectController";
import {
  SPOT_STUDIO_GROUP_COLOR,
  SPOT_STUDIO_WAYPOINT_COLOR
} from "../spot-studio/spotStudioColors";
import {
  AREA_TYPE_OPTIONS,
  createClientId,
  getAreaTypeMeta,
  normalizeSpotArea,
  normalizeSpotEditor
} from "../spot-studio/spotEditorModel";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getDesktopBridge() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.haechiDesktop ?? null;
}

function DesktopStudioWindow({
  projectId,
  focusType = "deck",
  focusId = "",
  actorId = ""
}) {
  const desktopBridge = getDesktopBridge();
  const isSpotStudio = focusType === "spot";
  const [project, setProject] = useState(null);
  const [selection, setSelection] = useState({ type: "deck", id: "" });
  const [spotToolMode, setSpotToolMode] = useState("navigate");
  const [activeWaypointGroupId, setActiveWaypointGroupId] = useState("");
  const [edgeDirectionMode, setEdgeDirectionMode] = useState("bidirectional");
  const [edgeLinkMode, setEdgeLinkMode] = useState("hold");
  const [spotLayerVisibility, setSpotLayerVisibility] = useState({
    grid: true,
    waypoints: true,
    edges: true,
    areas: true,
    groups: true
  });
  const [selectedWaypointId, setSelectedWaypointId] = useState("");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [edgeAnchorWaypointId, setEdgeAnchorWaypointId] = useState("");
  const [spotCanvasMenu, setSpotCanvasMenu] = useState(null);
  const [hierarchyOpen, setHierarchyOpen] = useState({
    groups: true,
    waypoints: true,
    edges: true
  });
  const [mapViewportMeta, setMapViewportMeta] = useState({ scale: 1 });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [spotEditModal, setSpotEditModal] = useState(null);
  const [hierarchySelectionKeys, setHierarchySelectionKeys] = useState([]);
  const [hierarchyAnchorKey, setHierarchyAnchorKey] = useState("");
  const { updateSpotEditor, updateSpot } = createDesktopStudioProjectController({
    project,
    isSpotStudio,
    setProject,
    setSelection
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProject() {
      if (!desktopBridge?.isDesktop || !projectId) {
        return;
      }

      try {
        setError("");
        const payload = await desktopBridge.readMapProject(projectId);

        if (!isMounted) {
          return;
        }

        setProject(payload);
        setSelection({ type: "deck", id: payload.deckId });
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "맵 프로젝트를 불러오지 못했습니다.");
        }
      }
    }

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [desktopBridge, projectId]);

  useEffect(() => {
    if (!project) {
      return;
    }

    if (isSpotStudio) {
      const spotsInProject = project.spots ?? [];
      const currentSelectedSpot =
        selection.type === "spot" ? spotsInProject.find((spot) => spot.id === selection.id) : null;

      if (currentSelectedSpot) {
        return;
      }

      if (focusId) {
        const targetSpot = spotsInProject.find((spot) => spot.id === focusId);

        if (targetSpot) {
          setSelection({ type: "spot", id: targetSpot.id });
          return;
        }
      }

      if (spotsInProject.length > 0) {
        setSelection({ type: "spot", id: spotsInProject[0].id });
      }
      return;
    }

    if (focusType === "spot" && focusId) {
      const targetSpot = (project.spots ?? []).find((spot) => spot.id === focusId);

      if (targetSpot) {
        setSelection({ type: "spot", id: targetSpot.id });
        return;
      }
    }

    if ((project?.spots?.length ?? 0) === 1) {
      setSelection({ type: "spot", id: project.spots[0].id });
      return;
    }

    setSelection({ type: "deck", id: project.deckId });
  }, [focusId, focusType, isSpotStudio, project, selection.id, selection.type]);

  useEffect(() => {
    if (!isSpotStudio || !project) {
      return;
    }

    setSpotToolMode("navigate");
  }, [isSpotStudio, project?.deckId, selection.id, selection.type]);

  useEffect(() => {
    if (spotToolMode !== "edge" && edgeAnchorWaypointId) {
      setEdgeAnchorWaypointId("");
    }
  }, [edgeAnchorWaypointId, spotToolMode]);

  useEffect(() => {
    if (!spotCanvasMenu) {
      return undefined;
    }

    function closeMenu(event) {
      if (event && typeof event.button === "number" && event.button !== 0) {
        return;
      }
      const target = event?.target;
      if (target instanceof HTMLElement && target.closest(".studio-context-menu")) {
        return;
      }
      setSpotCanvasMenu(null);
    }

    window.addEventListener("pointerdown", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("pointerdown", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [spotCanvasMenu]);

  useEffect(() => {
    if (spotToolMode === "edge" && spotCanvasMenu) {
      setSpotCanvasMenu(null);
    }
  }, [spotCanvasMenu, spotToolMode]);

  useEffect(() => {
    if (!project) {
      if (selectedWaypointId) {
        setSelectedWaypointId("");
      }
      if (selectedEdgeId) {
        setSelectedEdgeId("");
      }
      if (selectedAreaId) {
        setSelectedAreaId("");
      }
      if (edgeAnchorWaypointId) {
        setEdgeAnchorWaypointId("");
      }
      if (hierarchySelectionKeys.length) {
        setHierarchySelectionKeys([]);
      }
      if (hierarchyAnchorKey) {
        setHierarchyAnchorKey("");
      }
      return;
    }

    const spots = project.spots ?? [];
    const selectedSpot =
      spots.find((spot) => selection.type === "spot" && spot.id === selection.id) ?? null;
    const effectiveSpot = selectedSpot ?? (spots.length === 1 ? spots[0] : null);
    const editorState = normalizeSpotEditor(effectiveSpot?.editor);
    const waypoints = editorState.waypoints;
    const waypointGroups = editorState.waypointGroups;
    const edges = editorState.edges;
    const areas = editorState.zones;

    if (selectedWaypointId && !waypoints.some((waypoint) => waypoint.id === selectedWaypointId)) {
      setSelectedWaypointId("");
    }

    if (edgeAnchorWaypointId && !waypoints.some((waypoint) => waypoint.id === edgeAnchorWaypointId)) {
      setEdgeAnchorWaypointId("");
    }

    if (selectedEdgeId && !edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId("");
    }

    if (selectedAreaId && !areas.some((area) => area.id === selectedAreaId)) {
      setSelectedAreaId("");
    }

    if (!waypointGroups.length && activeWaypointGroupId) {
      setActiveWaypointGroupId("");
    }

    if (
      waypointGroups.length &&
      !waypointGroups.some((group) => group.id === activeWaypointGroupId)
    ) {
      setActiveWaypointGroupId(waypointGroups[0].id);
    }

    const validHierarchyKeys = new Set([
      ...waypointGroups.map((group) => `group:${group.id}`),
      ...waypoints.map((waypoint) => `waypoint:${waypoint.id}`),
      ...edges.map((edge) => `edge:${edge.id}`)
    ]);

    if (hierarchySelectionKeys.some((key) => !validHierarchyKeys.has(key))) {
      setHierarchySelectionKeys((current) => current.filter((key) => validHierarchyKeys.has(key)));
    }

    if (hierarchyAnchorKey && !validHierarchyKeys.has(hierarchyAnchorKey)) {
      setHierarchyAnchorKey("");
    }
  }, [
    activeWaypointGroupId,
    edgeAnchorWaypointId,
    hierarchyAnchorKey,
    hierarchySelectionKeys,
    project,
    selectedAreaId,
    selectedEdgeId,
    selectedWaypointId,
    selection.id,
    selection.type
  ]);

  useEffect(() => {
    if (!isSpotStudio || !project || spotEditModal) {
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
  }, [isSpotStudio, project, spotEditModal, hierarchySelectionKeys, selectedWaypointId, selectedEdgeId, selectedAreaId]);

  useEffect(() => {
    if (!isSpotStudio || !project || spotEditModal || spotToolMode !== "edge") {
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
  }, [isSpotStudio, project, spotEditModal, spotToolMode]);

  if (!desktopBridge?.isDesktop) {
    return <div className="loading-panel is-error">Electron 데스크톱 환경이 아닙니다.</div>;
  }

  if (!project) {
    return (
      <div className="desktop-window-root is-desktop">
        <WindowTitleBar title="HAECHI Studio" />
        <div className="desktop-window-content screen-shell screen-dashboard desktop-studio-screen">
          <div className="loading-panel">{error || "맵 프로젝트를 준비하는 중입니다."}</div>
        </div>
      </div>
    );
  }

  const spots = project.spots ?? [];
  const noGoZones = project.noGoZones ?? [];
  const dockItems = [...(project.docks ?? []), ...(project.portals ?? [])];
  const selectedSpot =
    spots.find((spot) => selection.type === "spot" && spot.id === selection.id) ?? null;
  const selectedNoGo =
    noGoZones.find((zone) => selection.type === "nogo" && zone.id === selection.id) ?? null;
  const selectedDock =
    dockItems.find((dock) => selection.type === "dock" && dock.id === selection.id) ?? null;
  const effectiveSpot = selectedSpot ?? (spots.length === 1 ? spots[0] : null);
  const spotImage = effectiveSpot?.image ?? null;
  const activeCanvasImage = isSpotStudio ? spotImage ?? project.image ?? null : project.image ?? null;
  const effectiveCalibration = effectiveSpot?.calibration ?? project.calibration ?? null;
  const studioEyebrow = isSpotStudio ? "Spot Studio" : focusType === "domain" ? "Domain Studio" : "Deck Studio";
  const studioTitle = isSpotStudio ? effectiveSpot?.name ?? "Spot Studio" : `${project.label} ${project.name}`;
  const studioCopy = isSpotStudio
    ? "선택된 Spot의 원점, 해상도, 회전 값을 기준으로 단위 맵을 정밀 보정합니다."
    : `${project.domainName} 로컬 폴더 프로젝트를 독립 창에서 편집합니다.`;
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
  const hierarchySelectedKeySet = new Set(hierarchySelectionKeys);

  function getEdgeDisplayName(edge) {
    if (!edge) {
      return "";
    }

    const fromLabel = waypointDisplayNameById.get(edge.from) ?? edge.from;
    const toLabel = waypointDisplayNameById.get(edge.to) ?? edge.to;
    return `${fromLabel} - ${toLabel}`;
  }

  function getHierarchyKey(type, id) {
    return `${type}:${id}`;
  }

  function getGroupSelectionKeys(groupId, editorState = effectiveSpotEditor) {
    if (!groupId) {
      return [];
    }

    const waypointKeys = editorState.waypoints
      .filter((waypoint) => waypoint.groupId === groupId)
      .map((waypoint) => getHierarchyKey("waypoint", waypoint.id));
    const edgeKeys = editorState.edges
      .filter((edge) => edge.groupId === groupId)
      .map((edge) => getHierarchyKey("edge", edge.id));

    return [getHierarchyKey("group", groupId), ...waypointKeys, ...edgeKeys];
  }

  function applyPrimarySelection(type, id) {
    if (type === "group") {
      setSelectedAreaId("");
      setActiveWaypointGroupId(id);
      setSelectedWaypointId("");
      setSelectedEdgeId("");
      return;
    }

    if (type === "waypoint") {
      setSelectedAreaId("");
      setSelectedWaypointId(id);
      setSelectedEdgeId("");
      return;
    }

    if (type === "edge") {
      setSelectedAreaId("");
      setSelectedEdgeId(id);
      setSelectedWaypointId("");
      return;
    }

    if (type === "area") {
      setSelectedAreaId(id);
      setSelectedWaypointId("");
      setSelectedEdgeId("");
      setActiveWaypointGroupId("");
    }
  }

  function isHierarchyItemSelected(type, id) {
    const key = getHierarchyKey(type, id);
    if (hierarchySelectedKeySet.size) {
      return hierarchySelectedKeySet.has(key);
    }

    if (type === "group") {
      return activeWaypointGroupId === id;
    }

    if (type === "waypoint") {
      return selectedWaypointId === id;
    }

    if (type === "edge") {
      return selectedEdgeId === id;
    }

    if (type === "area") {
      return selectedAreaId === id;
    }

    return false;
  }

  function handleHierarchyItemClick(event, type, id, orderedKeys) {
    if (type === "group" && !event.shiftKey) {
      const groupSelectionKeys = getGroupSelectionKeys(id);
      const groupWaypointKeys = groupSelectionKeys.filter((selectionKey) => selectionKey.startsWith("waypoint:"));
      const isToggle = event.ctrlKey || event.metaKey;
      const nextSelectionKeys = isToggle
        ? hierarchySelectionKeys.includes(getHierarchyKey("group", id))
          ? hierarchySelectionKeys.filter(
              (selectionKey) => !groupSelectionKeys.includes(selectionKey)
            )
          : Array.from(new Set([...hierarchySelectionKeys, ...groupSelectionKeys]))
        : groupSelectionKeys;

      setHierarchySelectionKeys(nextSelectionKeys);
      setHierarchyAnchorKey(getHierarchyKey("group", id));
      if (!isToggle || nextSelectionKeys.includes(getHierarchyKey("group", id))) {
        applyPrimarySelection(type, id);
        setSelectedWaypointId(groupWaypointKeys[0]?.slice("waypoint:".length) ?? "");
      }
      return;
    }

    const key = getHierarchyKey(type, id);
    const isToggle = event.ctrlKey || event.metaKey;
    const isRange =
      event.shiftKey &&
      hierarchyAnchorKey &&
      hierarchyAnchorKey.startsWith(`${type}:`) &&
      Array.isArray(orderedKeys);
    const currentKeys = hierarchySelectionKeys;
    let nextSelectionKeys = [];

    if (isRange) {
      const fromIndex = orderedKeys.indexOf(hierarchyAnchorKey);
      const toIndex = orderedKeys.indexOf(key);

      if (fromIndex !== -1 && toIndex !== -1) {
        const [start, end] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
        const rangeKeys = orderedKeys.slice(start, end + 1);
        nextSelectionKeys = isToggle ? Array.from(new Set([...currentKeys, ...rangeKeys])) : rangeKeys;
      } else {
        nextSelectionKeys = [key];
      }
    } else if (isToggle) {
      nextSelectionKeys = currentKeys.includes(key)
        ? currentKeys.filter((item) => item !== key)
        : [...currentKeys, key];
    } else {
      nextSelectionKeys = [key];
    }

    setHierarchySelectionKeys(nextSelectionKeys);
    setHierarchyAnchorKey(key);
    if (!isToggle || nextSelectionKeys.includes(key)) {
      applyPrimarySelection(type, id);
    }
  }

  function handleDeleteHierarchySelection() {
    if (!effectiveSpot) {
      return;
    }

    const fallbackKeys = selectedAreaId
      ? [getHierarchyKey("area", selectedAreaId)]
      : selectedWaypointId
        ? [getHierarchyKey("waypoint", selectedWaypointId)]
        : selectedEdgeId
          ? [getHierarchyKey("edge", selectedEdgeId)]
          : [];
    const targetKeys = hierarchySelectionKeys.length ? hierarchySelectionKeys : fallbackKeys;

    if (!targetKeys.length) {
      return;
    }

    const deleteGroupIds = new Set();
    const deleteWaypointIds = new Set();
    const deleteEdgeIds = new Set();
    const deleteAreaIds = new Set();

    targetKeys.forEach((key) => {
      const [type, id] = key.split(":");
      if (!id) {
        return;
      }
      if (type === "group") {
        deleteGroupIds.add(id);
      } else if (type === "waypoint") {
        deleteWaypointIds.add(id);
      } else if (type === "edge") {
        deleteEdgeIds.add(id);
      } else if (type === "area") {
        deleteAreaIds.add(id);
      }
    });

    if (deleteGroupIds.size) {
      effectiveSpotEditor.waypoints.forEach((waypoint) => {
        if (deleteGroupIds.has(waypoint.groupId)) {
          deleteWaypointIds.delete(waypoint.id);
        }
      });
      effectiveSpotEditor.edges.forEach((edge) => {
        if (deleteGroupIds.has(edge.groupId)) {
          deleteEdgeIds.delete(edge.id);
        }
      });
    }

    if (!deleteGroupIds.size && !deleteWaypointIds.size && !deleteEdgeIds.size && !deleteAreaIds.size) {
      return;
    }

    let removedGroups = 0;
    let removedWaypoints = 0;
    let removedEdges = 0;
    let removedAreas = 0;

    updateSpotEditor(effectiveSpot.id, (editorState) => {
      const remainingGroups = editorState.waypointGroups.filter((group) => !deleteGroupIds.has(group.id));
      const remainingWaypoints = editorState.waypoints
        .filter((waypoint) => !deleteWaypointIds.has(waypoint.id))
        .map((waypoint) =>
          deleteGroupIds.has(waypoint.groupId)
            ? {
                ...waypoint,
                groupId: null
              }
            : waypoint
        );
      const remainingWaypointIdSet = new Set(remainingWaypoints.map((waypoint) => waypoint.id));
      const remainingEdges = editorState.edges
        .filter((edge) => {
          if (deleteEdgeIds.has(edge.id)) {
            return false;
          }
          if (!remainingWaypointIdSet.has(edge.from) || !remainingWaypointIdSet.has(edge.to)) {
            return false;
          }
          return true;
        })
        .map((edge) =>
          deleteGroupIds.has(edge.groupId)
            ? {
                ...edge,
                groupId: null
              }
            : edge
        );

      removedGroups = editorState.waypointGroups.length - remainingGroups.length;
      removedWaypoints = editorState.waypoints.length - remainingWaypoints.length;
      removedEdges = editorState.edges.length - remainingEdges.length;
      removedAreas = editorState.zones.filter((area) => deleteAreaIds.has(area.id)).length;

      return {
        ...editorState,
        waypointGroups: remainingGroups,
        waypoints: remainingWaypoints,
        zones: editorState.zones.filter((area) => !deleteAreaIds.has(area.id)),
        edges: remainingEdges
      };
    });

    if (selectedAreaId && deleteAreaIds.has(selectedAreaId)) {
      setSelectedAreaId("");
    }
    if (selectedWaypointId && deleteWaypointIds.has(selectedWaypointId)) {
      setSelectedWaypointId("");
    }
    if (selectedEdgeId && deleteEdgeIds.has(selectedEdgeId)) {
      setSelectedEdgeId("");
    }
    if (edgeAnchorWaypointId && deleteWaypointIds.has(edgeAnchorWaypointId)) {
      setEdgeAnchorWaypointId("");
    }
    if (activeWaypointGroupId && deleteGroupIds.has(activeWaypointGroupId)) {
      setActiveWaypointGroupId("");
    }

    setHierarchySelectionKeys([]);
    setHierarchyAnchorKey("");

    const removedParts = [];
    if (removedGroups > 0) {
      removedParts.push(`그룹 ${removedGroups}`);
    }
    if (removedWaypoints > 0) {
      removedParts.push(`웨이포인트 ${removedWaypoints}`);
    }
    if (removedEdges > 0) {
      removedParts.push(`간선 ${removedEdges}`);
    }
    if (removedAreas > 0) {
      removedParts.push(`구역 ${removedAreas}`);
    }

    if (removedParts.length) {
      setMessage(`${removedParts.join(", ")}개를 삭제했습니다.`);
      setError("");
    }
  }

  function handleAddWaypoint(position = null) {
    if (!effectiveSpot) {
      setError("Spot을 먼저 선택하세요.");
      return;
    }

    let nextWaypointId = "";
    updateSpotEditor(effectiveSpot.id, (editorState) => {
      const origin = position ?? effectiveCalibration?.origin ?? {
        x: effectiveSpot.x + effectiveSpot.width / 2,
        y: effectiveSpot.y + effectiveSpot.height / 2
      };
      const nextIndex = editorState.waypoints.length + 1;
      nextWaypointId = createClientId("wp");

      return {
        ...editorState,
        waypoints: [
          ...editorState.waypoints,
          {
            id: nextWaypointId,
            name: `WP-${nextIndex}`,
            x: Math.round(origin.x),
            y: Math.round(origin.y),
            groupId: null
          }
        ]
      };
    });
    if (nextWaypointId) {
      setSelectedAreaId("");
      setSelectedWaypointId(nextWaypointId);
    }
    setMessage("웨이포인트를 무소속으로 추가했습니다.");
    setError("");
  }

  function handleAssignWaypointGroup(waypointId, groupId) {
    if (!effectiveSpot || !waypointId) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypoint.id === waypointId
          ? {
              ...waypoint,
              groupId: groupId || null
            }
          : waypoint
      )
    }));
    setMessage("웨이포인트 그룹을 변경했습니다.");
    setError("");
  }

  function handleBulkUngroup() {
    if (!effectiveSpot) {
      return;
    }

    const waypointIds = hierarchySelectionKeys
      .filter((key) => key.startsWith("waypoint:"))
      .map((key) => key.slice("waypoint:".length));
    const edgeIds = hierarchySelectionKeys
      .filter((key) => key.startsWith("edge:"))
      .map((key) => key.slice("edge:".length));

    if (!waypointIds.length && !edgeIds.length) {
      setError("그룹 해제할 항목을 먼저 선택하세요.");
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypointIds.includes(waypoint.id)
          ? {
              ...waypoint,
              groupId: null
            }
          : waypoint
      ),
      edges: editorState.edges.map((edge) =>
        edgeIds.includes(edge.id)
          ? {
              ...edge,
              groupId: null
            }
          : edge
      )
    }));
    setMessage(`그룹을 해제했습니다. (WP ${waypointIds.length}, EDGE ${edgeIds.length})`);
    setError("");
  }

  function handleSelectGroup(groupId) {
    if (!groupId) {
      return;
    }

    const groupWaypoints = effectiveSpotEditor.waypoints.filter((waypoint) => waypoint.groupId === groupId);
    const groupEdges = effectiveSpotEditor.edges.filter((edge) => edge.groupId === groupId);
    setSelectedAreaId("");
    setActiveWaypointGroupId(groupId);
    setSelectedWaypointId(groupWaypoints[0]?.id ?? "");
    setSelectedEdgeId(groupEdges[0]?.id ?? "");
    setHierarchySelectionKeys(getGroupSelectionKeys(groupId));
    setHierarchyAnchorKey(`group:${groupId}`);
    setError("");
  }

  function handleMoveWaypointGroup(groupId, updates = []) {
    if (!effectiveSpot || !groupId || !Array.isArray(updates) || !updates.length) {
      return;
    }

    const nextById = new Map(updates.map((item) => [item.id, item]));
    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        nextById.has(waypoint.id)
          ? {
              ...waypoint,
              ...nextById.get(waypoint.id)
            }
          : waypoint
      )
    }));
  }

  function handleRenameWaypoint(waypointId, name) {
    if (!effectiveSpot || !waypointId || !name?.trim()) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypoint.id === waypointId
          ? {
              ...waypoint,
              name: name.trim()
            }
          : waypoint
      )
    }));
    setError("");
  }

  function handleRenameSpot(name) {
    if (!effectiveSpot || !name?.trim()) {
      return;
    }

    updateStudioSpot(effectiveSpot.id, {
      name: name.trim()
    });
    setError("");
  }

  function handleRenameGroup(groupId, name) {
    if (!effectiveSpot || !groupId || !name?.trim()) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypointGroups: editorState.waypointGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              name: name.trim()
            }
          : group
      )
    }));
    setError("");
  }

  function handleDeleteGroup(groupId) {
    if (!effectiveSpot || !groupId) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => {
      const remainingGroups = editorState.waypointGroups.filter((group) => group.id !== groupId);

      return {
        ...editorState,
        waypointGroups: remainingGroups,
        waypoints: editorState.waypoints.map((waypoint) =>
          waypoint.groupId === groupId
            ? {
                ...waypoint,
                groupId: null
              }
            : waypoint
        ),
        edges: editorState.edges.map((edge) =>
          edge.groupId === groupId
            ? {
                ...edge,
                groupId: null
              }
            : edge
        )
      };
    });
    if (activeWaypointGroupId === groupId) {
      setActiveWaypointGroupId("");
    }
    setMessage("그룹을 삭제했습니다.");
    setError("");
  }

  function handleRenameEdge(edgeId, name) {
    if (!effectiveSpot || !edgeId || !name?.trim()) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      edges: editorState.edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              name: name.trim()
            }
          : edge
      )
    }));
    setError("");
  }

  function handleDeleteEdge(edgeId) {
    if (!effectiveSpot || !edgeId) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      edges: editorState.edges.filter((edge) => edge.id !== edgeId)
    }));
    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId("");
    }
    setMessage("간선을 삭제했습니다.");
    setError("");
  }

  function handleUpdateWaypointColor(waypointId, color) {
    if (!effectiveSpot || !waypointId || !color) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypoint.id === waypointId
          ? {
              ...waypoint,
              color
            }
          : waypoint
      )
    }));
  }

  function handleUpdateEdgeColor(edgeId, color) {
    if (!effectiveSpot || !edgeId || !color) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      edges: editorState.edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              color
            }
          : edge
      )
    }));
  }

  function handleUpdateGroupColor(groupId, color) {
    if (!effectiveSpot || !groupId || !color) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypointGroups: editorState.waypointGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              color
            }
          : group
      ),
      waypoints: editorState.waypoints.map((waypoint) =>
        waypoint.groupId === groupId
          ? {
              ...waypoint,
              color
            }
          : waypoint
      ),
      edges: editorState.edges.map((edge) =>
        edge.groupId === groupId
          ? {
              ...edge,
              color
            }
          : edge
      )
    }));
    setMessage("그룹 색상을 멤버 전체에 적용했습니다.");
    setError("");
  }

  function handleUpdateGroupTagOpacity(groupId, tagOpacity) {
    if (!effectiveSpot || !groupId || tagOpacity === undefined) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypointGroups: editorState.waypointGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              tagOpacity: clamp(Number(tagOpacity ?? 0.24), 0.08, 0.85)
            }
          : group
      )
    }));
    setError("");
  }

  function handleAddArea(kind = "custom", position = null) {
    if (!effectiveSpot) {
      return;
    }

    const typeMeta = getAreaTypeMeta("custom");
    const canvasWidth = activeCanvasImage?.width ?? 1600;
    const canvasHeight = activeCanvasImage?.height ?? 900;
    const width = 184;
    const height = 116;
    const basePoint = position ?? {
      x: canvasWidth / 2,
      y: canvasHeight / 2
    };
    let nextAreaId = "";

    updateSpotEditor(effectiveSpot.id, (editorState) => {
      const nextIndex = editorState.zones.length + 1;
      nextAreaId = createClientId("area");

      return {
        ...editorState,
        zones: [
          ...editorState.zones,
          normalizeSpotArea({
            id: nextAreaId,
            name: `구역 ${nextIndex}`,
            kind: "custom",
            x: clamp(Math.round(basePoint.x - width / 2), 0, Math.max(0, canvasWidth - width)),
            y: clamp(Math.round(basePoint.y - height / 2), 0, Math.max(0, canvasHeight - height)),
            width,
            height,
            color: typeMeta.color,
            opacity: typeMeta.opacity
          }, nextIndex - 1)
        ]
      };
    });

    if (nextAreaId) {
      setSelectedAreaId(nextAreaId);
      setSelectedWaypointId("");
      setSelectedEdgeId("");
      setActiveWaypointGroupId("");
      setEdgeAnchorWaypointId("");
      setHierarchySelectionKeys([]);
      setHierarchyAnchorKey("");
      setMessage("구역을 추가했습니다.");
      setError("");
    }
  }

  function handleSelectArea(areaId) {
    if (!areaId) {
      return;
    }

    setSelectedAreaId(areaId);
    setSelectedWaypointId("");
    setSelectedEdgeId("");
    setActiveWaypointGroupId("");
    setEdgeAnchorWaypointId("");
    setHierarchySelectionKeys([]);
    setHierarchyAnchorKey("");
    setError("");
  }

  function handleRenameArea(areaId, name) {
    if (!effectiveSpot || !areaId || !name?.trim()) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      zones: editorState.zones.map((area) =>
        area.id === areaId
          ? {
              ...area,
              name: name.trim()
            }
          : area
      )
    }));
    setError("");
  }

  function handleUpdateArea(areaId, patch) {
    if (!effectiveSpot || !areaId || !patch) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      zones: editorState.zones.map((area) => {
        if (area.id !== areaId) {
          return area;
        }

        const nextTypeMeta = getAreaTypeMeta("custom");
        const nextArea = {
          ...area,
          ...patch,
          kind: "custom"
        };

        if (patch.x !== undefined) {
          nextArea.x = Math.round(Number(patch.x || 0));
        }
        if (patch.y !== undefined) {
          nextArea.y = Math.round(Number(patch.y || 0));
        }
        if (patch.width !== undefined) {
          nextArea.width = clamp(Number(patch.width || area.width), 48, 2400);
        }
        if (patch.height !== undefined) {
          nextArea.height = clamp(Number(patch.height || area.height), 48, 2400);
        }
        if (patch.opacity !== undefined) {
          nextArea.opacity = clamp(Number(patch.opacity || nextTypeMeta.opacity), 0.08, 0.85);
        }

        return nextArea;
      })
    }));
    setError("");
  }

  function handleDeleteArea(areaId) {
    if (!effectiveSpot || !areaId) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      zones: editorState.zones.filter((area) => area.id !== areaId)
    }));
    if (selectedAreaId === areaId) {
      setSelectedAreaId("");
    }
    setMessage("구역을 삭제했습니다.");
    setError("");
  }

  function handleDeleteWaypoint(waypointId) {
    if (!effectiveSpot || !waypointId) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.filter((waypoint) => waypoint.id !== waypointId),
      edges: editorState.edges.filter((edge) => edge.from !== waypointId && edge.to !== waypointId)
    }));
    if (selectedWaypointId === waypointId) {
      setSelectedWaypointId("");
    }
    if (edgeAnchorWaypointId === waypointId) {
      setEdgeAnchorWaypointId("");
    }
    setMessage("웨이포인트를 삭제했습니다.");
    setError("");
  }

  function handleAddEdge(
    fromWaypointId = null,
    toWaypointId = null,
    direction = "bidirectional",
    options = {}
  ) {
    const { silent = false, selectCreatedEdge = true } = options;

    if (!effectiveSpot) {
      if (!silent) {
        setError("Spot을 먼저 선택하세요.");
      }
      return { status: "no-spot", edgeId: "" };
    }

    let addResult = "added";
    let createdEdgeId = "";
    updateSpotEditor(effectiveSpot.id, (editorState) => {
      if (editorState.waypoints.length < 2) {
        addResult = "insufficient";
        return editorState;
      }

      const fromWaypoint =
        (fromWaypointId ? editorState.waypoints.find((waypoint) => waypoint.id === fromWaypointId) : null) ??
        editorState.waypoints[editorState.waypoints.length - 2];
      const toWaypoint =
        (toWaypointId ? editorState.waypoints.find((waypoint) => waypoint.id === toWaypointId) : null) ??
        editorState.waypoints[editorState.waypoints.length - 1];

      if (!fromWaypoint || !toWaypoint || fromWaypoint.id === toWaypoint.id) {
        addResult = "invalid";
        return editorState;
      }

      const normalizedDirection = direction === "unidirectional" ? "unidirectional" : "bidirectional";
      const exists = editorState.edges.some(
        (edge) => {
          const edgeDirection = edge.direction === "unidirectional" ? "unidirectional" : "bidirectional";
          const sameOrientation = edge.from === fromWaypoint.id && edge.to === toWaypoint.id;
          const oppositeOrientation = edge.from === toWaypoint.id && edge.to === fromWaypoint.id;

          if (normalizedDirection === "bidirectional") {
            return sameOrientation || oppositeOrientation;
          }

          if (edgeDirection === "bidirectional") {
            return sameOrientation || oppositeOrientation;
          }

          return sameOrientation;
        }
      );

      if (exists) {
        addResult = "duplicated";
        return editorState;
      }

      createdEdgeId = createClientId("edge");
      const derivedGroupId =
        fromWaypoint.groupId && fromWaypoint.groupId === toWaypoint.groupId ? fromWaypoint.groupId : null;
      return {
        ...editorState,
        edges: [
          ...editorState.edges,
          {
            id: createdEdgeId,
            name: `WP${editorState.waypoints.findIndex((waypoint) => waypoint.id === fromWaypoint.id) + 1} - WP${
              editorState.waypoints.findIndex((waypoint) => waypoint.id === toWaypoint.id) + 1
            }`,
            from: fromWaypoint.id,
            to: toWaypoint.id,
            direction: normalizedDirection,
            groupId: derivedGroupId
          }
        ]
      };
    });
    if (addResult === "insufficient") {
      if (!silent) {
        setError("간선을 만들려면 웨이포인트가 2개 이상 필요합니다.");
      }
      return { status: "insufficient", edgeId: "" };
    }

    if (addResult === "invalid") {
      if (!silent) {
        setError("간선 시작점과 종료점을 확인하세요.");
      }
      return { status: "invalid", edgeId: "" };
    }

    if (addResult === "duplicated") {
      if (!silent) {
        setError("이미 같은 방향의 간선이 존재합니다.");
      }
      return { status: "duplicated", edgeId: "" };
    }

    if (createdEdgeId && selectCreatedEdge) {
      setSelectedEdgeId(createdEdgeId);
    }
    if (!silent) {
      setMessage("간선을 추가했습니다.");
      setError("");
    }
    return { status: "added", edgeId: createdEdgeId };
  }

  function handleStartEdgeChain(waypointId) {
    if (!waypointId) {
      return;
    }

    setSpotToolMode("edge");
    setEdgeLinkMode("hold");
    setSelectedWaypointId(waypointId);
    setSelectedEdgeId("");
    setEdgeAnchorWaypointId(waypointId);
    setMessage("우클릭을 누른 채 이동하면 점선 프리뷰가 보이고, 버튼을 떼면 간선이 한 번에 생성됩니다.");
    setError("");
  }

  function handleEndEdgeChain(chainWaypointIds = []) {
    const path = Array.isArray(chainWaypointIds) ? chainWaypointIds : [];
    setEdgeAnchorWaypointId("");

    if (path.length < 2) {
      return;
    }

    let addedCount = 0;
    let duplicatedCount = 0;
    let skippedCount = 0;

    for (let index = 1; index < path.length; index += 1) {
      const fromWaypointId = path[index - 1];
      const toWaypointId = path[index];
      const result = handleAddEdge(fromWaypointId, toWaypointId, edgeDirectionMode, {
        silent: true,
        selectCreatedEdge: false
      });

      if (result.status === "added") {
        addedCount += 1;
      } else if (result.status === "duplicated") {
        duplicatedCount += 1;
      } else {
        skippedCount += 1;
      }
    }

    setSelectedWaypointId(path[path.length - 1] ?? "");
    setSelectedEdgeId("");

    if (addedCount > 0) {
      const suffixParts = [];
      if (duplicatedCount > 0) {
        suffixParts.push(`중복 ${duplicatedCount}`);
      }
      if (skippedCount > 0) {
        suffixParts.push(`스킵 ${skippedCount}`);
      }
      const suffix = suffixParts.length ? ` (${suffixParts.join(", ")})` : "";
      setMessage(`${addedCount}개 간선을 생성했습니다${suffix}.`);
      setError("");
      return;
    }

    setMessage("새로 생성된 간선이 없습니다.");
    setError("");
  }

  function handleMoveWaypoint(waypointId, point) {
    if (!effectiveSpot || !waypointId || !point) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypoint.id === waypointId
          ? {
              ...waypoint,
              x: Math.round(point.x),
              y: Math.round(point.y)
            }
          : waypoint
      )
    }));
  }

  function handleMoveWaypoints(updates = []) {
    if (!effectiveSpot || !Array.isArray(updates) || !updates.length) {
      return;
    }

    const nextById = new Map(
      updates
        .filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            Number.isFinite(item.x) &&
            Number.isFinite(item.y)
        )
        .map((item) => [item.id, { x: Math.round(item.x), y: Math.round(item.y) }])
    );

    if (!nextById.size) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        nextById.has(waypoint.id)
          ? {
              ...waypoint,
              ...nextById.get(waypoint.id)
            }
          : waypoint
      )
    }));
  }

  function handleMoveArea(areaId, point) {
    if (!effectiveSpot || !areaId || !point) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      zones: editorState.zones.map((area) =>
        area.id === areaId
          ? {
              ...area,
              x: Math.round(point.x),
              y: Math.round(point.y)
            }
          : area
      )
    }));
  }

  function handleResizeArea(areaId, patch) {
    if (!effectiveSpot || !areaId || !patch) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      zones: editorState.zones.map((area) =>
        area.id === areaId
          ? {
              ...area,
              x: Math.round(Number(patch.x ?? area.x)),
              y: Math.round(Number(patch.y ?? area.y)),
              width: clamp(Number(patch.width ?? area.width), 48, 2400),
              height: clamp(Number(patch.height ?? area.height), 48, 2400)
            }
          : area
      )
    }));
  }

  function handleSelectEdge(edgeId) {
    if (!edgeId) {
      return;
    }

    const targetEdge = effectiveSpotEditor.edges.find((edge) => edge.id === edgeId) ?? null;
    const shouldPreserveGroupSelection =
      Boolean(activeWaypointGroupId) && targetEdge?.groupId === activeWaypointGroupId;

    if (shouldPreserveGroupSelection) {
      setSelectedAreaId("");
      setSelectedEdgeId(edgeId);
      setSelectedWaypointId("");
      setEdgeAnchorWaypointId("");
      setHierarchySelectionKeys([`edge:${edgeId}`]);
      setHierarchyAnchorKey(`edge:${edgeId}`);
      setError("");
      return;
    }

    setSelectedAreaId("");
    setSelectedEdgeId(edgeId);
    setSelectedWaypointId("");
    setActiveWaypointGroupId("");
    setEdgeAnchorWaypointId("");
    setHierarchySelectionKeys([`edge:${edgeId}`]);
    setHierarchyAnchorKey(`edge:${edgeId}`);
    setError("");
  }

  function handleUpdateSelectedEdgeDirection(direction) {
    if (!effectiveSpot || !selectedEdge) {
      return;
    }

    const normalizedDirection = direction === "unidirectional" ? "unidirectional" : "bidirectional";
    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      edges: editorState.edges.map((edge) =>
        edge.id === selectedEdge.id
          ? {
              ...edge,
              direction: normalizedDirection
            }
          : edge
      )
    }));
    setMessage("간선 방향을 변경했습니다.");
    setError("");
  }

  function handleBulkUpdateEdgeDirection(direction) {
    if (!effectiveSpot || !selectedEdgeIds.length) {
      return;
    }

    const normalizedDirection = direction === "unidirectional" ? "unidirectional" : "bidirectional";
    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      edges: editorState.edges.map((edge) =>
        selectedEdgeIds.includes(edge.id)
          ? {
              ...edge,
              direction: normalizedDirection
            }
          : edge
      )
    }));
    setMessage(`${selectedEdgeIds.length}개 간선 방향을 변경했습니다.`);
    setError("");
  }

  function openSpotEditModal(modalConfig) {
    setSpotEditModal(modalConfig);
  }

  function openRenameWaypointModal(waypointId) {
    const waypoint = effectiveSpotEditor.waypoints.find((item) => item.id === waypointId);
    if (!waypoint) {
      return;
    }

    openSpotEditModal({
      caption: "RENAME",
      title: "Waypoint 이름 변경",
      description: "선택한 웨이포인트 이름을 변경합니다.",
      kind: "input",
      initialValue: waypoint.name ?? "",
      confirmText: "저장",
      onConfirm: async (value) => {
        handleRenameWaypoint(waypointId, value);
      }
    });
  }

  function openRenameGroupModal(groupId) {
    const group = effectiveSpotEditor.waypointGroups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }

    openSpotEditModal({
      caption: "RENAME",
      title: "Waypoint Group 이름 변경",
      description: "선택한 그룹 이름을 변경합니다.",
      kind: "input",
      initialValue: group.name ?? "",
      confirmText: "저장",
      onConfirm: async (value) => {
        handleRenameGroup(groupId, value);
      }
    });
  }

  function openRenameEdgeModal(edgeId) {
    const edge = effectiveSpotEditor.edges.find((item) => item.id === edgeId);
    if (!edge) {
      return;
    }

    openSpotEditModal({
      caption: "RENAME",
      title: "Edge 이름 변경",
      description: "선택한 간선 이름을 변경합니다.",
      kind: "input",
      initialValue: edge.name ?? getEdgeDisplayName(edge),
      confirmText: "저장",
      onConfirm: async (value) => {
        handleRenameEdge(edgeId, value);
      }
    });
  }

  function openRenameAreaModal(areaId) {
    const area = effectiveSpotEditor.zones.find((item) => item.id === areaId);
    if (!area) {
      return;
    }

    openSpotEditModal({
      caption: "RENAME",
      title: "Area 이름 변경",
      description: "선택한 구역 이름을 변경합니다.",
      kind: "input",
      initialValue: area.name ?? "",
      confirmText: "저장",
      onConfirm: async (value) => {
        handleRenameArea(areaId, value);
      }
    });
  }

  function openDeleteWaypointModal(waypointId) {
    const waypoint = effectiveSpotEditor.waypoints.find((item) => item.id === waypointId);
    if (!waypoint) {
      return;
    }

    openSpotEditModal({
      caption: "DELETE",
      title: "Waypoint 삭제",
      description: `${waypoint.name}를 삭제하시겠습니까? 연결 간선도 함께 제거됩니다.`,
      kind: "confirm",
      tone: "danger",
      confirmText: "삭제",
      onConfirm: async () => {
        handleDeleteWaypoint(waypointId);
      }
    });
  }

  function openDeleteGroupModal(groupId) {
    const group = effectiveSpotEditor.waypointGroups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }

    openSpotEditModal({
      caption: "DELETE",
      title: "Waypoint Group 삭제",
      description: `${group.name} 그룹을 삭제하시겠습니까? 포함된 웨이포인트와 간선은 무소속 상태로 전환됩니다.`,
      kind: "confirm",
      tone: "danger",
      confirmText: "삭제",
      onConfirm: async () => {
        handleDeleteGroup(groupId);
      }
    });
  }

  function openDeleteEdgeModal(edgeId) {
    const edge = effectiveSpotEditor.edges.find((item) => item.id === edgeId);
    if (!edge) {
      return;
    }

    openSpotEditModal({
      caption: "DELETE",
      title: "Edge 삭제",
      description: `${getEdgeDisplayName(edge)} 간선을 삭제하시겠습니까?`,
      kind: "confirm",
      tone: "danger",
      confirmText: "삭제",
      onConfirm: async () => {
        handleDeleteEdge(edgeId);
      }
    });
  }

  function openDeleteAreaModal(areaId) {
    const area = effectiveSpotEditor.zones.find((item) => item.id === areaId);
    if (!area) {
      return;
    }

    openSpotEditModal({
      caption: "DELETE",
      title: "Area 삭제",
      description: `${area.name} 구역을 삭제하시겠습니까?`,
      kind: "confirm",
      tone: "danger",
      confirmText: "삭제",
      onConfirm: async () => {
        handleDeleteArea(areaId);
      }
    });
  }

  function handleWaypointSelection(waypointId) {
    if (!waypointId) {
      return;
    }

    if (isSpotStudio && spotToolMode === "edge" && edgeLinkMode === "single") {
      if (!edgeAnchorWaypointId) {
        setSelectedAreaId("");
        setSelectedWaypointId(waypointId);
        setSelectedEdgeId("");
        setEdgeAnchorWaypointId(waypointId);
        setMessage("간선 시작점을 선택했습니다. 연결할 웨이포인트를 클릭하세요.");
        setError("");
        return;
      }

      if (edgeAnchorWaypointId === waypointId) {
        setMessage("시작점이 선택된 상태입니다. 다른 웨이포인트를 클릭해 연결하세요.");
        setError("");
        return;
      }

      const result = handleAddEdge(edgeAnchorWaypointId, waypointId, edgeDirectionMode, {
        silent: false,
        selectCreatedEdge: true
      });

      if (result.status === "added") {
        setSelectedAreaId("");
        setEdgeAnchorWaypointId("");
        setSelectedWaypointId(waypointId);
        setSelectedEdgeId(result.edgeId || "");
        setHierarchySelectionKeys([`waypoint:${waypointId}`]);
        setHierarchyAnchorKey(`waypoint:${waypointId}`);
      }
      return;
    }

    const targetWaypoint = effectiveSpotEditor.waypoints.find((waypoint) => waypoint.id === waypointId) ?? null;
    const shouldPreserveGroupSelection =
      Boolean(activeWaypointGroupId) && targetWaypoint?.groupId === activeWaypointGroupId;

    if (shouldPreserveGroupSelection) {
      setSelectedAreaId("");
      setSelectedWaypointId(waypointId);
      setSelectedEdgeId("");
      setHierarchySelectionKeys([`waypoint:${waypointId}`]);
      setHierarchyAnchorKey(`waypoint:${waypointId}`);
      return;
    }

    setSelectedAreaId("");
    setActiveWaypointGroupId("");
    setSelectedWaypointId(waypointId);
    setSelectedEdgeId("");
    setHierarchySelectionKeys([`waypoint:${waypointId}`]);
    setHierarchyAnchorKey(`waypoint:${waypointId}`);
  }

  function handleFocusWaypoint(waypointId) {
    if (!waypointId || spotToolMode === "edge") {
      return;
    }

    setSelectedAreaId("");
    setActiveWaypointGroupId("");
    setSelectedWaypointId(waypointId);
    setSelectedEdgeId("");
    setHierarchySelectionKeys([`waypoint:${waypointId}`]);
    setHierarchyAnchorKey(`waypoint:${waypointId}`);
    setMessage("웨이포인트 단독 포커스로 전환했습니다.");
    setError("");
  }

  function handleSpotCanvasContextMenu(event, payload = null) {
    if (!isSpotStudio) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (spotToolMode === "edge") {
      setSpotCanvasMenu(null);
      return;
    }

    const selectedWaypointKeys = hierarchySelectionKeys.filter((key) => key.startsWith("waypoint:"));
    const selectedEdgeKeys = hierarchySelectionKeys.filter((key) => key.startsWith("edge:"));
    const hasBatchSelection = selectedWaypointKeys.length > 0 || selectedEdgeKeys.length > 0;
    const selectedWaypointIds = selectedWaypointKeys.map((key) => key.slice("waypoint:".length));
    const selectedEdgeIds = selectedEdgeKeys.map((key) => key.slice("edge:".length));
    const payloadType = payload?.type ?? "";
    const isSelectedWaypointContext =
      payloadType === "waypoint" && selectedWaypointIds.includes(payload?.waypointId ?? "");
    const isSelectedEdgeContext = payloadType === "edge" && selectedEdgeIds.includes(payload?.edgeId ?? "");
    const shouldOpenBatchMenu =
      hasBatchSelection &&
      (payloadType === "canvas" || (selectedWaypointIds.length > 1 && isSelectedWaypointContext) || isSelectedEdgeContext);

    const nextPayload =
      shouldOpenBatchMenu
        ? {
            ...payload,
            type: "batch-selection",
            selectedWaypointIds,
            selectedEdgeIds
          }
        : payload;
    setSpotCanvasMenu({
      x: event.clientX,
      y: event.clientY,
      payload: nextPayload
    });
  }

  function handleCanvasMarqueeSelect({ waypointIds = [], edgeIds = [] } = {}) {
    const waypointKeys = waypointIds.map((id) => `waypoint:${id}`);
    const edgeKeys = edgeIds.map((id) => `edge:${id}`);
    const mergedKeys = [...waypointKeys, ...edgeKeys];
    setSelectedAreaId("");
    setActiveWaypointGroupId("");
    setHierarchySelectionKeys(mergedKeys);
    setHierarchyAnchorKey(mergedKeys[0] ?? "");
    if (waypointIds.length > 0) {
      setSelectedWaypointId(waypointIds[0]);
      setSelectedEdgeId(edgeIds.length ? edgeIds[0] : "");
    } else if (edgeIds.length > 0) {
      setSelectedWaypointId("");
      setSelectedEdgeId(edgeIds[0]);
    } else {
      setSelectedWaypointId("");
      setSelectedEdgeId("");
    }
    setMessage(
      mergedKeys.length
        ? `선택: 웨이포인트 ${waypointIds.length}개, 간선 ${edgeIds.length}개`
        : "선택된 항목이 없습니다."
    );
    setError("");
  }

  function handleClearCanvasSelection() {
    if (spotToolMode === "edge") {
      return;
    }
    setHierarchySelectionKeys([]);
    setHierarchyAnchorKey("");
    setActiveWaypointGroupId("");
    setSelectedAreaId("");
    setSelectedWaypointId("");
    setSelectedEdgeId("");
    setEdgeAnchorWaypointId("");
    setSpotCanvasMenu(null);
  }

  function handleBulkAssignGroup(groupId) {
    if (!effectiveSpot) {
      return;
    }
    const waypointIds = hierarchySelectionKeys
      .filter((key) => key.startsWith("waypoint:"))
      .map((key) => key.slice("waypoint:".length));
    const edgeIds = hierarchySelectionKeys
      .filter((key) => key.startsWith("edge:"))
      .map((key) => key.slice("edge:".length));
    if (!waypointIds.length && !edgeIds.length) {
      setError("그룹 지정할 항목을 먼저 선택하세요.");
      return;
    }
    const targetGroupId = groupId || effectiveSpotEditor.waypointGroups[0]?.id || null;
    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypointIds.includes(waypoint.id)
          ? {
              ...waypoint,
              groupId: targetGroupId
            }
          : waypoint
      ),
      edges: editorState.edges.map((edge) =>
        edgeIds.includes(edge.id)
          ? {
              ...edge,
              groupId: targetGroupId
            }
          : edge
      )
    }));
    if (targetGroupId) {
      setSelectedAreaId("");
      setActiveWaypointGroupId(targetGroupId);
      setSelectedWaypointId(waypointIds[0] ?? "");
      setSelectedEdgeId(edgeIds[0] ?? "");
      setHierarchySelectionKeys([
        `group:${targetGroupId}`,
        ...waypointIds.map((id) => `waypoint:${id}`),
        ...edgeIds.map((id) => `edge:${id}`)
      ]);
      setHierarchyAnchorKey(`group:${targetGroupId}`);
    }
    setMessage(`그룹을 지정했습니다. (WP ${waypointIds.length}, EDGE ${edgeIds.length})`);
    setError("");
  }

  function handleBulkCreateGroupAndAssign() {
    if (!effectiveSpot) {
      return;
    }
    const waypointIds = hierarchySelectionKeys
      .filter((key) => key.startsWith("waypoint:"))
      .map((key) => key.slice("waypoint:".length));
    const edgeIds = hierarchySelectionKeys
      .filter((key) => key.startsWith("edge:"))
      .map((key) => key.slice("edge:".length));
    if (!waypointIds.length && !edgeIds.length) {
      setError("그룹에 넣을 항목을 먼저 선택하세요.");
      return;
    }

    let nextGroupId = "";
    updateSpotEditor(effectiveSpot.id, (editorState) => {
      const nextIndex = editorState.waypointGroups.length + 1;
      nextGroupId = createClientId("group");
      const nextGroups = [
        ...editorState.waypointGroups,
        {
          id: nextGroupId,
          name: `Group ${nextIndex}`,
          color: SPOT_STUDIO_GROUP_COLOR,
          tagOpacity: 0.24
        }
      ];
      return {
        ...editorState,
        waypointGroups: nextGroups,
        waypoints: editorState.waypoints.map((waypoint) =>
          waypointIds.includes(waypoint.id)
            ? {
                ...waypoint,
                groupId: nextGroupId
              }
            : waypoint
        ),
        edges: editorState.edges.map((edge) =>
          edgeIds.includes(edge.id)
            ? {
                ...edge,
                groupId: nextGroupId
              }
            : edge
        )
      };
    });
    if (nextGroupId) {
      setSelectedAreaId("");
      setActiveWaypointGroupId(nextGroupId);
      setSelectedWaypointId(waypointIds[0] ?? "");
      setSelectedEdgeId(edgeIds[0] ?? "");
      setHierarchySelectionKeys([
        `group:${nextGroupId}`,
        ...waypointIds.map((id) => `waypoint:${id}`),
        ...edgeIds.map((id) => `edge:${id}`)
      ]);
      setHierarchyAnchorKey(`group:${nextGroupId}`);
      setMessage(`새 그룹을 만들고 항목을 배정했습니다. (WP ${waypointIds.length}, EDGE ${edgeIds.length})`);
      setError("");
    }
  }

  function toggleHierarchySection(sectionKey) {
    setHierarchyOpen((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey]
    }));
  }

  function handleOriginPick(point) {
    if (!effectiveSpot) {
      setError("Spot을 선택한 뒤 원점을 지정하세요.");
      return;
    }

    if (!isSpotStudio || spotToolMode !== "origin") {
      return;
    }

    updateSpot(effectiveSpot.id, {
      calibration: {
        origin: {
          x: Math.round(point.x),
          y: Math.round(point.y)
        }
      }
    });
    setError("");
    setMessage(`${effectiveSpot.name} Spot 원점을 갱신했습니다.`);
    setSpotToolMode("navigate");
  }

  async function handleSave() {
    try {
      setPending(true);
      setError("");
      const saved = await desktopBridge.saveMapProject({
        projectId,
        project
      });

      setProject(saved);
      setMessage("로컬 맵 프로젝트를 저장했습니다.");
    } catch (saveError) {
      setError(saveError.message || "맵 프로젝트를 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function handlePickImage() {
    try {
      setPending(true);
      setError("");
      const nextProject = await desktopBridge.pickMapImage({
        projectId,
        spotId: isSpotStudio ? effectiveSpot?.id ?? "" : ""
      });

      if (nextProject) {
        setProject(nextProject);
        setMessage(
          isSpotStudio && effectiveSpot
            ? `${effectiveSpot.name} Spot 이미지를 저장했습니다.`
            : "Deck 이미지를 assets 폴더로 복사했습니다."
        );
      }
    } catch (pickError) {
      setError(pickError.message || "이미지를 가져오지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  function handleToggleOriginToolMode() {
    setSpotToolMode((current) => (current === "origin" ? "navigate" : "origin"));
    setEdgeAnchorWaypointId("");
  }

  function handleStopEdgeToolMode() {
    setSpotToolMode("navigate");
    setEdgeAnchorWaypointId("");
  }

  function handleToggleEdgeToolMode() {
    setSpotToolMode((current) => (current === "edge" ? "navigate" : "edge"));
    setEdgeAnchorWaypointId("");
  }

  function handleChangeEdgeLinkMode(nextMode) {
    setEdgeLinkMode(nextMode);
    setEdgeAnchorWaypointId("");

    if (nextMode === "single") {
      setMessage("단일 연결 모드: 시작 웨이포인트 클릭 후 대상을 클릭하세요.");
      setError("");
      return;
    }

    if (nextMode === "hold") {
      setMessage("홀드 체인 모드: 우클릭을 누른 채 드래그 후 떼면 생성됩니다.");
      setError("");
    }
  }

  function handleToggleSpotLayerVisibility(layerId) {
    setSpotLayerVisibility((current) => ({
      ...current,
      [layerId]: current[layerId] === false
    }));
  }

  return (
    <div className="desktop-window-root is-desktop">
      <WindowTitleBar title={`${studioTitle} · HAECHI Studio`} />
      <div className="desktop-window-content screen-shell screen-dashboard desktop-studio-screen">
        <section className="panel-frame workspace-header desktop-studio-header">
        <div>
          <p className="section-label" lang="en">
            {studioEyebrow}
          </p>
          <h1>{studioTitle}</h1>
          <p className="topbar-copy">{studioCopy}</p>
        </div>

        <div className="workspace-header-side">
          <button type="button" className="primary-button studio-header-save-button" onClick={handleSave} disabled={pending}>
            저장
          </button>
        </div>
        </section>

      <section
        className={`panel-frame studio-shell desktop-studio-shell ${isSpotStudio ? "is-spot-studio" : ""}`}
      >
        <aside className="studio-library-panel">
          {!isSpotStudio ? (
            <div className="panel-heading">
              <div>
                <p className="section-label" lang="en">
                  Files
                </p>
                <h2>프로젝트 파일</h2>
              </div>
            </div>
          ) : null}

          {isSpotStudio ? (
            <SpotHierarchySidebar
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
          ) : (
            <>
              <div className="studio-tree-list">
                <div className="studio-tree-item studio-tree-summary">
                  <span className="studio-tree-icon">MAP</span>
                  <div>
                    <strong>project.json</strong>
                    <small>구조 및 좌표 정의</small>
                  </div>
                </div>
                <div className="studio-tree-item studio-tree-summary">
                  <span className="studio-tree-icon">IMG</span>
                  <div>
                    <strong>{project.image?.fileName ?? "No image"}</strong>
                    <small>assets 폴더</small>
                  </div>
                </div>
              </div>

              <div className="studio-action-row">
                <button type="button" className="ghost-button" onClick={handlePickImage} disabled={pending}>
                  이미지 업로드
                </button>
              </div>
            </>
          )}

            {!isSpotStudio && message ? (
              <div className="selection-strip">
                <strong>{message}</strong>
              </div>
            ) : null}

            {!isSpotStudio && error ? (
              <div className="selection-strip is-alert">
                <strong className="selection-text is-alert">{error}</strong>
              </div>
            ) : null}
          </aside>

        <div className={`studio-browser-panel ${isSpotStudio ? "is-spot-workspace" : ""}`}>
          <div className="unity-studio-panel-titlebar">
            <div className={`unity-studio-panel-copy ${isSpotStudio ? "is-inline-spot-title" : ""}`}>
              <p className="section-label" lang="en">
                {isSpotStudio ? "Scene" : "Preview"}
              </p>
              <h2>{isSpotStudio ? effectiveSpot?.name ?? project.name : `${project.label} ${project.name}`}</h2>
            </div>
            <div className="studio-breadcrumbs">
              <span>{project.domainName}</span>
              <span>{project.label}</span>
              {effectiveSpot ? <span>{effectiveSpot.name}</span> : <span>{project.status}</span>}
            </div>
          </div>

          {isSpotStudio ? (
            <div className="unity-studio-panel-toolbarbar">
              <SpotStudioToolbar
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
          ) : null}

          {isSpotStudio ? null : (
            <section className="studio-folder-section">
              <div className="panel-heading">
                <h2>구성 요소</h2>
              </div>
              <div className="studio-asset-columns">
                <div className="studio-asset-group">
                  <span className="studio-library-label">Spots</span>
                  <div className="studio-asset-list">
                    {spots.length ? (
                      spots.map((spot) => (
                        <button
                          key={spot.id}
                          type="button"
                          className={`studio-asset-item ${
                            selection.type === "spot" && selection.id === spot.id ? "is-active" : ""
                          }`}
                          onClick={() => setSelection({ type: "spot", id: spot.id })}
                        >
                          <strong>{spot.name}</strong>
                          <small>{spot.width}px x {spot.height}px</small>
                        </button>
                      ))
                    ) : (
                      <div className="empty-state compact-empty">등록된 Spot이 없습니다.</div>
                    )}
                  </div>
                </div>
                <div className="studio-asset-group">
                  <span className="studio-library-label">No-Go</span>
                  <div className="studio-asset-list">
                    {noGoZones.length ? (
                      noGoZones.map((zone) => (
                        <button
                          key={zone.id}
                          type="button"
                          className={`studio-asset-item ${
                            selection.type === "nogo" && selection.id === zone.id ? "is-active" : ""
                          }`}
                          onClick={() => setSelection({ type: "nogo", id: zone.id })}
                        >
                          <strong>{zone.name}</strong>
                          <small>{zone.width}px x {zone.height}px</small>
                        </button>
                      ))
                    ) : (
                      <div className="empty-state compact-empty">등록된 금지 구역이 없습니다.</div>
                    )}
                  </div>
                </div>

                <div className="studio-asset-group">
                  <span className="studio-library-label">Docks & Portals</span>
                  <div className="studio-asset-list">
                    {dockItems.length ? (
                      dockItems.map((dock) => (
                        <button
                          key={dock.id}
                          type="button"
                          className={`studio-asset-item ${
                            selection.type === "dock" && selection.id === dock.id ? "is-active" : ""
                          }`}
                          onClick={() => setSelection({ type: "dock", id: dock.id })}
                        >
                          <strong>{dock.name}</strong>
                          <small>{dock.kind ?? "dock"}</small>
                        </button>
                      ))
                    ) : (
                      <div className="empty-state compact-empty">등록된 도킹 포인트가 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="studio-preview-panel">
            <MapCanvas
              deck={project}
              robots={[]}
              accessibleSpotIds={spots.map((spot) => spot.id)}
              selectedRobotId=""
              selectedNode={selection}
              onCanvasClick={handleOriginPick}
              onSelectSpot={(spot) => setSelection({ type: "spot", id: spot.id })}
              onSelectNoGo={(zone) => setSelection({ type: "nogo", id: zone.id })}
              onSelectDock={(dock) => setSelection({ type: "dock", id: dock.id })}
              showSpots={!isSpotStudio}
              showNoGo={!isSpotStudio}
              showDocks={!isSpotStudio}
              interactive
              originPlacementMode={isSpotStudio && spotToolMode === "origin"}
              showMiniMap={isSpotStudio}
              onViewportChange={setMapViewportMeta}
              spotEditorData={isSpotStudio ? effectiveSpotEditor : null}
              showSpotEditorLayer={isSpotStudio}
              spotLayerVisibility={spotLayerVisibility}
              onToggleSpotLayerVisibility={handleToggleSpotLayerVisibility}
              edgeCreateMode={isSpotStudio && spotToolMode === "edge"}
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
            {isSpotStudio ? (
              <SpotSelectionOverlay
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
            ) : null}
          </section>
        </div>

        <SpotStudioInspectorPanel
          isSpotStudio={isSpotStudio}
          effectiveSpot={effectiveSpot}
          project={project}
          activeCanvasImage={activeCanvasImage}
          effectiveSpotEditor={effectiveSpotEditor}
          effectiveCalibration={effectiveCalibration}
          onUpdateCalibration={(patch) => {
            if (!effectiveSpot) {
              return;
            }
            updateSpot(effectiveSpot.id, {
              calibration: patch
            });
          }}
          spotsCount={spots.length}
        />
      </section>

      {isSpotStudio && spotCanvasMenu ? (
        <SpotStudioContextMenu
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
