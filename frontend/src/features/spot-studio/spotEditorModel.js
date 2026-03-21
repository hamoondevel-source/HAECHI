import { SPOT_STUDIO_AREA_COLOR } from "./spotStudioColors";

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

export function updateProjectSpotEditor(project, spotId, updater) {
  const currentProject = project ?? null;
  const currentSpots = currentProject?.spots ?? [];
  const targetSpot = currentSpots.find((spot) => spot.id === spotId) ?? null;

  if (!currentProject || !targetSpot) {
    return {
      foundSpot: false,
      project: currentProject,
      spot: null
    };
  }

  const nextEditor = normalizeSpotEditor(updater(normalizeSpotEditor(targetSpot.editor), targetSpot));
  const nextProject = {
    ...currentProject,
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
    project: nextProject,
    spot: nextProject.spots.find((spot) => spot.id === spotId) ?? null
  };
}

export function updateProjectSpot(project, spotId, patch) {
  const currentProject = project ?? null;
  const currentSpots = currentProject?.spots ?? [];
  const targetSpot = currentSpots.find((spot) => spot.id === spotId) ?? null;

  if (!currentProject || !targetSpot) {
    return {
      foundSpot: false,
      project: currentProject,
      spot: null
    };
  }

  const nextProject = {
    ...currentProject,
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
    project: nextProject,
    spot: nextProject.spots.find((spot) => spot.id === spotId) ?? null
  };
}
