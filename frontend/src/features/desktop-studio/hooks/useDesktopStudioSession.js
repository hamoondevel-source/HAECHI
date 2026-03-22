import { useEffect, useState } from "react";
import { loadDesktopStudioDocument } from "../controllers/desktopStudioDocumentController";
import { toStudioDeckSavePatch } from "../model/studioDeckDocument";
import { normalizeSpotEditor } from "../../spot-studio/model/spotEditorModel";

function getDeckDraftSignature(nextDeckDraft) {
  if (!nextDeckDraft) {
    return "";
  }

  return JSON.stringify(toStudioDeckSavePatch(nextDeckDraft));
}

export default function useDesktopStudioSession({
  actorId = "",
  deckId = "",
  focusType = "deck",
  focusId = "",
  desktopBridge = null
}) {
  const isSpotStudio = focusType === "spot";
  const [deckDraft, setDeckDraft] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [savedDeckSignature, setSavedDeckSignature] = useState("");
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

  function markPersistedDeckDraft(nextDeckDraft) {
    setDeckDraft(nextDeckDraft);
    setSavedDeckSignature(getDeckDraftSignature(nextDeckDraft));
  }

  function showReadOnlyError() {
    setMessage("");
    setError("읽기 전용 Studio입니다. ROOT 권한에서만 편집할 수 있습니다.");
  }

  function runEditableAction(action) {
    if (!canEdit) {
      showReadOnlyError();
      return undefined;
    }

    return action();
  }

  const isDirty = Boolean(deckDraft && canEdit && getDeckDraftSignature(deckDraft) !== savedDeckSignature);

  useEffect(() => {
    let isMounted = true;

    async function loadDeckDraft() {
      if (!desktopBridge?.isDesktop) {
        return;
      }

      if (isMounted) {
        setCanEdit(false);
        setSavedDeckSignature("");
      }

      if (!deckId) {
        if (isMounted) {
          setError("Studio 창에 deckId가 전달되지 않았습니다. Electron 앱을 다시 시작해 주세요.");
        }
        return;
      }

      try {
        setError("");
        const payload = await loadDesktopStudioDocument({
          actorId,
          deckId
        });

        if (!isMounted) {
          return;
        }

        setCanEdit(Boolean(payload.canEdit));
        markPersistedDeckDraft(payload.deckDraft);
        setSelection({ type: "deck", id: payload.deckDraft.deckId });
      } catch (loadError) {
        if (isMounted) {
          setCanEdit(false);
          setError(loadError.message || "Deck 초안을 불러오지 못했습니다.");
        }
      }
    }

    loadDeckDraft();

    return () => {
      isMounted = false;
    };
  }, [actorId, deckId, desktopBridge]);

  useEffect(() => {
    if (!deckDraft) {
      return;
    }

    if (isSpotStudio) {
      const spotsInDeck = deckDraft.spots ?? [];
      const currentSelectedSpot =
        selection.type === "spot" ? spotsInDeck.find((spot) => spot.id === selection.id) : null;

      if (currentSelectedSpot) {
        return;
      }

      if (focusId) {
        const targetSpot = spotsInDeck.find((spot) => spot.id === focusId);

        if (targetSpot) {
          setSelection({ type: "spot", id: targetSpot.id });
          return;
        }
      }

      if (spotsInDeck.length > 0) {
        setSelection({ type: "spot", id: spotsInDeck[0].id });
      }
      return;
    }

    const selectedSpot =
      selection.type === "spot"
        ? (deckDraft.spots ?? []).find((spot) => spot.id === selection.id) ?? null
        : null;
    const selectedNoGo =
      selection.type === "nogo"
        ? (deckDraft.noGoZones ?? []).find((zone) => zone.id === selection.id) ?? null
        : null;
    const selectedDock =
      selection.type === "dock"
        ? [...(deckDraft.docks ?? []), ...(deckDraft.portals ?? [])].find((dock) => dock.id === selection.id) ?? null
        : null;
    const hasValidSelection =
      (selection.type === "deck" && selection.id === deckDraft.deckId) ||
      Boolean(selectedSpot) ||
      Boolean(selectedNoGo) ||
      Boolean(selectedDock);

    if (hasValidSelection) {
      return;
    }

    if (focusType === "spot" && focusId) {
      const targetSpot = (deckDraft.spots ?? []).find((spot) => spot.id === focusId);

      if (targetSpot) {
        setSelection({ type: "spot", id: targetSpot.id });
        return;
      }
    }

    setSelection({ type: "deck", id: deckDraft.deckId });
  }, [deckDraft, focusId, focusType, isSpotStudio, selection.id, selection.type]);

  useEffect(() => {
    if (!isSpotStudio || !deckDraft) {
      return;
    }

    setSpotToolMode("navigate");
  }, [deckDraft?.deckId, isSpotStudio, selection.id, selection.type]);

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
    if (!deckDraft) {
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

    const spots = deckDraft.spots ?? [];
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

    if (waypointGroups.length && !waypointGroups.some((group) => group.id === activeWaypointGroupId)) {
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
    deckDraft,
    selectedAreaId,
    selectedEdgeId,
    selectedWaypointId,
    selection.id,
    selection.type
  ]);

  return {
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
    mapViewportMeta,
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
  };
}
