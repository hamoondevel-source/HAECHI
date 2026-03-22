import { updateDeckSpot } from "../../spot-studio/model/spotEditorModel";

function mergeCalibration(currentCalibration, patchCalibration) {
  if (!patchCalibration) {
    return currentCalibration;
  }

  return {
    ...(currentCalibration ?? {}),
    ...patchCalibration,
    origin: {
      ...(currentCalibration?.origin ?? {}),
      ...(patchCalibration.origin ?? {})
    }
  };
}

export function resolveDeckStudioSelection(deckDraft, selection) {
  const spots = deckDraft?.spots ?? [];
  const noGoZones = deckDraft?.noGoZones ?? [];
  const dockItems = [...(deckDraft?.docks ?? []), ...(deckDraft?.portals ?? [])];

  return {
    spots,
    noGoZones,
    dockItems,
    selectedSpot: spots.find((spot) => selection?.type === "spot" && spot.id === selection.id) ?? null,
    selectedNoGo: noGoZones.find((zone) => selection?.type === "nogo" && zone.id === selection.id) ?? null,
    selectedDock: dockItems.find((dock) => selection?.type === "dock" && dock.id === selection.id) ?? null
  };
}

export function buildDeckPortalTargetLabelById(deckDraft) {
  return new Map(
    (deckDraft?.allDecks ?? []).map((deck) => [deck.id, `${deck.label} ${deck.name}`])
  );
}

export function buildDeckSpotSceneSummaries(spots = []) {
  return new Map(
    spots.map((spot) => [
      spot.id,
      {
        waypoints: spot.editor?.waypoints?.length ?? 0,
        edges: spot.editor?.edges?.length ?? 0,
        areas: spot.editor?.zones?.length ?? 0
      }
    ])
  );
}

export function isDeckStudioSpotPlaced(spot) {
  return spot?.isPlaced === true;
}

function resolveDeckResolution(deckDraft) {
  return Math.max(0.001, Number(deckDraft?.calibration?.resolution ?? 0.05));
}

function resolveSpotResolution(spot, fallbackResolution) {
  return Math.max(0.001, Number(spot?.calibration?.resolution ?? fallbackResolution ?? 0.05));
}

function resolveSpotSourceSize(spot) {
  const baseWidth = Number(spot?.placementBaseWidth ?? spot?.width ?? spot?.image?.width ?? 240);
  const baseHeight = Number(spot?.placementBaseHeight ?? spot?.height ?? spot?.image?.height ?? 160);

  return {
    width: Math.max(32, baseWidth),
    height: Math.max(32, baseHeight)
  };
}

export function resolveDeckStudioSpotPlacementSize(deckDraft, spot) {
  const deckResolution = resolveDeckResolution(deckDraft);
  const spotResolution = resolveSpotResolution(spot, deckResolution);
  const sourceSize = resolveSpotSourceSize(spot);
  const resolutionScale = spotResolution / deckResolution;

  return {
    width: Math.max(32, Math.round(sourceSize.width * resolutionScale)),
    height: Math.max(32, Math.round(sourceSize.height * resolutionScale))
  };
}

function resolveDeckStudioSpotPlacementBounds(deckDraft, spotWidth, spotHeight) {
  const deckImageWidth = Number(deckDraft?.image?.width ?? 1600);
  const deckImageHeight = Number(deckDraft?.image?.height ?? 900);

  return {
    minX: -Math.max(0, Number(spotWidth ?? 0)),
    minY: -Math.max(0, Number(spotHeight ?? 0)),
    maxX: deckImageWidth,
    maxY: deckImageHeight
  };
}

function normalizeDeckStudioSpotPlacement(deckDraft, spot) {
  const sourceSize = resolveSpotSourceSize(spot);
  const nextSize = resolveDeckStudioSpotPlacementSize(deckDraft, spot);
  const rawX = Number(spot?.x ?? 0);
  const rawY = Number(spot?.y ?? 0);
  const nextIsPlaced = spot?.isPlaced === true;
  const placementBounds = resolveDeckStudioSpotPlacementBounds(deckDraft, nextSize.width, nextSize.height);

  return {
    ...spot,
    placementBaseWidth: sourceSize.width,
    placementBaseHeight: sourceSize.height,
    isPlaced: nextIsPlaced,
    width: nextSize.width,
    height: nextSize.height,
    x: Math.round(clamp(rawX, placementBounds.minX, placementBounds.maxX)),
    y: Math.round(clamp(rawY, placementBounds.minY, placementBounds.maxY))
  };
}

export function prepareDeckStudioDraft(deckDraft) {
  if (!deckDraft) {
    return deckDraft;
  }

  let changed = false;
  const nextSpots = (deckDraft.spots ?? []).map((spot) => {
    const normalizedSpot = normalizeDeckStudioSpotPlacement(deckDraft, spot);

    if (
      normalizedSpot.placementBaseWidth !== spot.placementBaseWidth ||
      normalizedSpot.placementBaseHeight !== spot.placementBaseHeight ||
      normalizedSpot.isPlaced !== spot.isPlaced ||
      normalizedSpot.width !== spot.width ||
      normalizedSpot.height !== spot.height ||
      normalizedSpot.x !== spot.x ||
      normalizedSpot.y !== spot.y
    ) {
      changed = true;
    }

    return normalizedSpot;
  });

  if (!changed) {
    return deckDraft;
  }

  return {
    ...deckDraft,
    spots: nextSpots
  };
}

export function resolveDeckStudioSpotAssignmentPatch(deckDraft, spotId, point = null) {
  const targetSpot = (deckDraft?.spots ?? []).find((spot) => spot.id === spotId) ?? null;

  if (!targetSpot) {
    return null;
  }

  const nextSize = resolveDeckStudioSpotPlacementSize(deckDraft, targetSpot);
  const placementBounds = resolveDeckStudioSpotPlacementBounds(deckDraft, nextSize.width, nextSize.height);
  const fallbackX = Number.isFinite(Number(targetSpot.x))
    ? Number(targetSpot.x)
    : Math.max(0, ((Number(deckDraft?.image?.width ?? 1600)) - nextSize.width) / 2);
  const fallbackY = Number.isFinite(Number(targetSpot.y))
    ? Number(targetSpot.y)
    : Math.max(0, ((Number(deckDraft?.image?.height ?? 900)) - nextSize.height) / 2);
  const rawX = point ? Number(point.x ?? fallbackX) - nextSize.width / 2 : fallbackX;
  const rawY = point ? Number(point.y ?? fallbackY) - nextSize.height / 2 : fallbackY;

  return {
    isPlaced: true,
    width: nextSize.width,
    height: nextSize.height,
    x: Math.round(clamp(rawX, placementBounds.minX, placementBounds.maxX)),
    y: Math.round(clamp(rawY, placementBounds.minY, placementBounds.maxY))
  };
}

export function resolveDeckStudioSpotUnassignmentPatch() {
  return {
    isPlaced: false
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function resolveDeckStudioSpotDropPatch(deckDraft, spotId, point) {
  return resolveDeckStudioSpotAssignmentPatch(deckDraft, spotId, point);
}

export function updateDeckStudioMetadata(deckDraft, patch) {
  if (!deckDraft) {
    return null;
  }

  return {
    ...deckDraft,
    ...patch,
    image: patch?.image
      ? {
          ...(deckDraft.image ?? {}),
          ...patch.image
        }
      : deckDraft.image,
    calibration: mergeCalibration(deckDraft.calibration, patch?.calibration)
  };
}

export function updateDeckStudioSpot(deckDraft, spotId, patch) {
  const result = updateDeckSpot(deckDraft, spotId, patch);
  return result.foundSpot ? result.deckDraft : null;
}

export function updateDeckStudioNoGoZone(deckDraft, zoneId, patch) {
  if (!deckDraft || !(deckDraft.noGoZones ?? []).some((zone) => zone.id === zoneId)) {
    return null;
  }

  return {
    ...deckDraft,
    noGoZones: (deckDraft.noGoZones ?? []).map((zone) =>
      zone.id === zoneId ? { ...zone, ...patch } : zone
    )
  };
}

export function updateDeckStudioDock(deckDraft, dockId, patch) {
  const hasTarget =
    [...(deckDraft?.docks ?? []), ...(deckDraft?.portals ?? [])].some((dock) => dock.id === dockId);

  if (!deckDraft || !hasTarget) {
    return null;
  }

  return {
    ...deckDraft,
    docks: (deckDraft.docks ?? []).map((dock) => (dock.id === dockId ? { ...dock, ...patch } : dock)),
    portals: (deckDraft.portals ?? []).map((dock) => (dock.id === dockId ? { ...dock, ...patch } : dock))
  };
}

export function resolveDeckStudioDeleteLabel(deckDraft, targetSelection) {
  const { selectedSpot, selectedNoGo, selectedDock } = resolveDeckStudioSelection(deckDraft, targetSelection);

  if (targetSelection?.type === "spot") {
    return {
      typeLabel: "Spot",
      targetLabel: selectedSpot?.name ?? "Spot"
    };
  }

  if (targetSelection?.type === "nogo") {
    return {
      typeLabel: "No-Go",
      targetLabel: selectedNoGo?.name ?? "No-Go"
    };
  }

  return {
    typeLabel: selectedDock?.kind === "vertical" ? "Portal" : "Dock",
    targetLabel: selectedDock?.name ?? (selectedDock?.kind === "vertical" ? "Portal" : "Dock")
  };
}
