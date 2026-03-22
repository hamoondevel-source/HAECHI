import { SPOT_STUDIO_AREA_COLOR } from "../constants/spotStudioColors.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createClientId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const AREA_TYPE_OPTIONS = [
  { id: "custom", label: "구역", shortLabel: "AREA", color: SPOT_STUDIO_AREA_COLOR, opacity: 0.14 }
];

const AREA_TYPE_META_BY_ID = Object.fromEntries(AREA_TYPE_OPTIONS.map((option) => [option.id, option]));

export function getAreaTypeMeta(kind = "custom") {
  return AREA_TYPE_META_BY_ID[kind] ?? AREA_TYPE_META_BY_ID.custom;
}

export function normalizeSpotArea(area, index = 0) {
  const kind = "custom";
  const typeMeta = getAreaTypeMeta("custom");

  return {
    id: area?.id ?? `area-${index}`,
    name: area?.name ?? `구역 ${index + 1}`,
    kind,
    x: Math.round(Number(area?.x ?? 120)),
    y: Math.round(Number(area?.y ?? 120)),
    width: clamp(Number(area?.width ?? 184), 48, 2400),
    height: clamp(Number(area?.height ?? 116), 48, 2400),
    color: area?.color ?? typeMeta.color,
    opacity: clamp(Number(area?.opacity ?? typeMeta.opacity), 0.08, 0.85)
  };
}

export function normalizeSpotEditor(editor) {
  const normalizedGroups = Array.isArray(editor?.waypointGroups)
    ? editor.waypointGroups.map((group) => ({
        ...group,
        tagOpacity: clamp(Number(group?.tagOpacity ?? 0.24), 0.08, 0.85)
      }))
    : [];
  const normalizedEdges = Array.isArray(editor?.edges)
    ? editor.edges.map((edge) => ({
        ...edge,
        direction: edge?.direction === "unidirectional" ? "unidirectional" : "bidirectional",
        groupId: edge?.groupId ?? null
      }))
    : [];

  return {
    waypointGroups: normalizedGroups,
    waypoints: Array.isArray(editor?.waypoints) ? editor.waypoints : [],
    zones: Array.isArray(editor?.zones) ? editor.zones.map((area, index) => normalizeSpotArea(area, index)) : [],
    edges: normalizedEdges
  };
}

function normalizeEdgeDirection(direction = "bidirectional") {
  return direction === "unidirectional" ? "unidirectional" : "bidirectional";
}

function findEdgeWaypoint(editorState, waypointId, fallbackIndex) {
  if (waypointId) {
    return editorState.waypoints.find((waypoint) => waypoint.id === waypointId) ?? null;
  }

  return editorState.waypoints[fallbackIndex] ?? null;
}

function hasConflictingEdge(editorState, fromWaypointId, toWaypointId, direction) {
  return editorState.edges.some((edge) => {
    const edgeDirection = normalizeEdgeDirection(edge.direction);
    const sameOrientation = edge.from === fromWaypointId && edge.to === toWaypointId;
    const oppositeOrientation = edge.from === toWaypointId && edge.to === fromWaypointId;

    if (direction === "bidirectional") {
      return sameOrientation || oppositeOrientation;
    }

    if (edgeDirection === "bidirectional") {
      return sameOrientation || oppositeOrientation;
    }

    return sameOrientation;
  });
}

function createEditorEdge(editorState, fromWaypoint, toWaypoint, direction) {
  const createdEdgeId = createClientId("edge");
  const derivedGroupId =
    fromWaypoint.groupId && fromWaypoint.groupId === toWaypoint.groupId ? fromWaypoint.groupId : null;

  return {
    id: createdEdgeId,
    name: `WP${editorState.waypoints.findIndex((waypoint) => waypoint.id === fromWaypoint.id) + 1} - WP${
      editorState.waypoints.findIndex((waypoint) => waypoint.id === toWaypoint.id) + 1
    }`,
    from: fromWaypoint.id,
    to: toWaypoint.id,
    direction,
    groupId: derivedGroupId
  };
}

export function appendSpotEditorEdge(editor, options = {}) {
  const editorState = normalizeSpotEditor(editor);
  const {
    fromWaypointId = null,
    toWaypointId = null,
    direction = "bidirectional"
  } = options;

  if (editorState.waypoints.length < 2) {
    return {
      status: "insufficient",
      edgeId: "",
      nextEditorState: editorState
    };
  }

  const fromWaypoint = findEdgeWaypoint(editorState, fromWaypointId, editorState.waypoints.length - 2);
  const toWaypoint = findEdgeWaypoint(editorState, toWaypointId, editorState.waypoints.length - 1);

  if (!fromWaypoint || !toWaypoint || fromWaypoint.id === toWaypoint.id) {
    return {
      status: "invalid",
      edgeId: "",
      nextEditorState: editorState
    };
  }

  const normalizedDirection = normalizeEdgeDirection(direction);

  if (hasConflictingEdge(editorState, fromWaypoint.id, toWaypoint.id, normalizedDirection)) {
    return {
      status: "duplicated",
      edgeId: "",
      nextEditorState: editorState
    };
  }

  const nextEdge = createEditorEdge(editorState, fromWaypoint, toWaypoint, normalizedDirection);

  return {
    status: "added",
    edgeId: nextEdge.id,
    nextEditorState: {
      ...editorState,
      edges: [...editorState.edges, nextEdge]
    }
  };
}

export function appendSpotEditorEdgeChain(editor, options = {}) {
  const editorState = normalizeSpotEditor(editor);
  const { waypointIds = [], direction = "bidirectional" } = options;
  const path = Array.isArray(waypointIds) ? waypointIds : [];
  const normalizedDirection = normalizeEdgeDirection(direction);
  const addedEdgeIds = [];
  let duplicatedCount = 0;
  let skippedCount = 0;
  let nextEditorState = editorState;

  for (let index = 1; index < path.length; index += 1) {
    const edgeResult = appendSpotEditorEdge(nextEditorState, {
      fromWaypointId: path[index - 1],
      toWaypointId: path[index],
      direction: normalizedDirection
    });

    if (edgeResult.status === "added") {
      nextEditorState = edgeResult.nextEditorState;
      addedEdgeIds.push(edgeResult.edgeId);
      continue;
    }

    if (edgeResult.status === "duplicated") {
      duplicatedCount += 1;
      continue;
    }

    skippedCount += 1;
  }

  return {
    status: addedEdgeIds.length ? "added" : "unchanged",
    addedEdgeIds,
    addedCount: addedEdgeIds.length,
    duplicatedCount,
    skippedCount,
    nextEditorState
  };
}

export function updateDeckSpotEditor(deckDraft, spotId, updater) {
  const currentDeckDraft = deckDraft ?? null;
  const currentSpots = currentDeckDraft?.spots ?? [];
  const targetSpot = currentSpots.find((spot) => spot.id === spotId) ?? null;

  if (!currentDeckDraft || !targetSpot) {
    return {
      foundSpot: false,
      deckDraft: currentDeckDraft,
      spot: null
    };
  }

  const nextEditor = normalizeSpotEditor(updater(normalizeSpotEditor(targetSpot.editor), targetSpot));
  const nextDeckDraft = {
    ...currentDeckDraft,
    spots: currentSpots.map((spot) =>
      spot.id === spotId
        ? {
            ...spot,
            editor: nextEditor
          }
        : spot
    )
  };

  return {
    foundSpot: true,
    deckDraft: nextDeckDraft,
    spot: nextDeckDraft.spots.find((spot) => spot.id === spotId) ?? null
  };
}

export function updateDeckSpot(deckDraft, spotId, patch) {
  const currentDeckDraft = deckDraft ?? null;
  const currentSpots = currentDeckDraft?.spots ?? [];
  const targetSpot = currentSpots.find((spot) => spot.id === spotId) ?? null;

  if (!currentDeckDraft || !targetSpot) {
    return {
      foundSpot: false,
      deckDraft: currentDeckDraft,
      spot: null
    };
  }

  const nextDeckDraft = {
    ...currentDeckDraft,
    spots: currentSpots.map((spot) =>
      spot.id === spotId
        ? {
            ...spot,
            ...patch,
            calibration: patch?.calibration
              ? {
                  ...(spot.calibration ?? {}),
                  ...patch.calibration,
                  origin: {
                    ...(spot.calibration?.origin ?? {}),
                    ...(patch.calibration?.origin ?? {})
                  }
                }
              : spot.calibration,
            editor: patch?.editor
              ? normalizeSpotEditor({
                  ...normalizeSpotEditor(spot.editor),
                  ...patch.editor
                })
              : spot.editor
          }
        : spot
    )
  };

  return {
    foundSpot: true,
    deckDraft: nextDeckDraft,
    spot: nextDeckDraft.spots.find((spot) => spot.id === spotId) ?? null
  };
}
