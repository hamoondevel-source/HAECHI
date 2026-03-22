import fs from "fs/promises";
import path from "path";

function createMapStudioError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function slugify(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getMapAssetMimeType(fileName = "") {
  const extension = path.extname(String(fileName || "")).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  if (extension === ".svg") {
    return "image/svg+xml";
  }

  return "image/png";
}

export function getMapAssetExtension(fileName = "", mimeType = "") {
  const normalizedExtension = path.extname(String(fileName || "")).toLowerCase();

  if (normalizedExtension) {
    return normalizedExtension;
  }

  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  if (mimeType === "image/svg+xml") {
    return ".svg";
  }

  return ".png";
}

export function decodeBase64DataUrl(dataUrl = "") {
  const normalized = String(dataUrl || "").trim();
  const match = normalized.match(/^data:([^;,]+);base64,(.+)$/);

  if (!match) {
    throw createMapStudioError(400, "유효한 base64 이미지 데이터가 필요합니다.");
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

export function updateDraftDeck(mapStore, deckId, updater, touchDraftVersion, findDeckById) {
  const draftDeck = findDeckById(mapStore.draft, deckId);

  if (!draftDeck) {
    return null;
  }

  updater(draftDeck);
  touchDraftVersion();
  return draftDeck;
}

export function applyDeckMetadataPatch(draftDeck, patch, createDefaultGridCalibration) {
  if (typeof patch?.name === "string" && patch.name.trim()) {
    draftDeck.name = patch.name.trim();
  }

  if (typeof patch?.label === "string" && patch.label.trim()) {
    draftDeck.label = patch.label.trim();
  }

  if (Number.isFinite(patch?.elevation)) {
    draftDeck.elevation = Number(patch.elevation);
  }

  if (patch?.image) {
    draftDeck.image = {
      ...draftDeck.image,
      ...patch.image,
      src: patch.image.serverSrc ?? patch.image.src ?? draftDeck.image?.src ?? null
    };
  }

  if (patch?.calibration) {
    draftDeck.calibration = {
      ...(draftDeck.calibration ?? createDefaultGridCalibration()),
      ...patch.calibration,
      origin: {
        ...(draftDeck.calibration?.origin ?? { x: 240, y: 640 }),
        ...(patch.calibration.origin ?? {})
      }
    };
  }
}

export function applySpotPatch(draftDeck, spotId, patch) {
  draftDeck.spots = (draftDeck.spots ?? []).map((spot) =>
    spot.id === spotId
      ? {
          ...spot,
          ...patch,
          image: patch?.image
            ? {
                ...(spot.image ?? {}),
                ...patch.image,
                src: patch.image.serverSrc ?? patch.image.src ?? spot.image?.src ?? null
              }
            : spot.image,
          calibration: patch?.calibration
            ? {
                ...(spot.calibration ?? {}),
                ...patch.calibration,
                origin: {
                  ...(spot.calibration?.origin ?? {}),
                  ...(patch.calibration.origin ?? {})
                }
              }
            : spot.calibration
        }
      : spot
  );
}

export function applyNoGoPatch(draftDeck, zoneId, patch) {
  draftDeck.noGoZones = (draftDeck.noGoZones ?? []).map((zone) =>
    zone.id === zoneId ? { ...zone, ...patch } : zone
  );
}

export function applyDockPatch(draftDeck, dockId, patch) {
  draftDeck.docks = (draftDeck.docks ?? []).map((dock) =>
    dock.id === dockId ? { ...dock, ...patch } : dock
  );
  draftDeck.portals = (draftDeck.portals ?? []).map((dock) =>
    dock.id === dockId ? { ...dock, ...patch } : dock
  );
}

export function applyStudioDeckPatch(draftDeck, patch) {
  if (patch.image) {
    draftDeck.image = {
      ...draftDeck.image,
      ...patch.image
    };
  }

  if (patch.calibration) {
    draftDeck.calibration = {
      ...(draftDeck.calibration ?? {}),
      ...patch.calibration,
      origin: {
        ...(draftDeck.calibration?.origin ?? { x: 240, y: 640 }),
        ...(patch.calibration.origin ?? {})
      }
    };
  }

  if (typeof patch.name === "string" && patch.name.trim()) {
    draftDeck.name = patch.name.trim();
  }

  if (typeof patch.label === "string" && patch.label.trim()) {
    draftDeck.label = patch.label.trim();
  }

  if (Number.isFinite(patch.elevation)) {
    draftDeck.elevation = Number(patch.elevation);
  }

  if (Array.isArray(patch.spots)) {
    draftDeck.spots = patch.spots;
  }

  if (Array.isArray(patch.noGoZones)) {
    draftDeck.noGoZones = patch.noGoZones;
  }

  if (Array.isArray(patch.docks)) {
    draftDeck.docks = patch.docks;
  }

  if (Array.isArray(patch.portals)) {
    draftDeck.portals = patch.portals;
  }
}

export function renameDraftDomain(mapStore, name, touchDraftVersion) {
  const normalizedName = typeof name === "string" ? name.trim() : "";

  if (!normalizedName) {
    throw createMapStudioError(400, "Domain 이름을 입력하세요.");
  }

  mapStore.draft.name = normalizedName;
  touchDraftVersion();
  return mapStore.draft;
}

export function publishDraftMap(mapStore) {
  mapStore.published = structuredClone(mapStore.draft);
  mapStore.published.status = "published";
  mapStore.published.version = `published-${new Date().toISOString()}`;
  mapStore.published.updatedAt = new Date().toISOString();
  return mapStore.published;
}

export function createDraftDeck({
  mapStore,
  label,
  name,
  createDefaultDeck,
  touchDraftVersion
}) {
  const nextDeck = createDefaultDeck((mapStore.draft.decks?.length ?? 0) + 1);
  const normalizedLabel = typeof label === "string" ? label.trim() : "";
  const normalizedName = typeof name === "string" ? name.trim() : "";

  if (normalizedLabel) {
    nextDeck.label = normalizedLabel;
  }

  if (normalizedName) {
    nextDeck.name = normalizedName;
  }

  mapStore.draft.decks.push(nextDeck);
  mapStore.draft.activeDeckId = nextDeck.id;
  touchDraftVersion();
  return nextDeck;
}

export function deleteDraftDeck({ mapStore, deckId, touchDraftVersion }) {
  if ((mapStore.draft.decks?.length ?? 0) <= 1) {
    throw createMapStudioError(400, "최소 1개의 Deck은 유지해야 합니다.");
  }

  const targetIndex = mapStore.draft.decks.findIndex((deck) => deck.id === deckId);

  if (targetIndex < 0) {
    throw createMapStudioError(404, "삭제할 Deck을 찾을 수 없습니다.");
  }

  const [removedDeck] = mapStore.draft.decks.splice(targetIndex, 1);
  mapStore.draft.decks.forEach((deck) => {
    deck.portals = (deck.portals ?? []).map((portal) =>
      portal.targetDeckId === removedDeck.id ? { ...portal, targetDeckId: null } : portal
    );
  });

  if (mapStore.draft.activeDeckId === removedDeck.id) {
    mapStore.draft.activeDeckId = mapStore.draft.decks[0]?.id ?? "";
  }

  touchDraftVersion();
  return removedDeck;
}

export function createDraftSpot({
  mapStore,
  deckId,
  spot,
  updateDraftDeck,
  touchDraftVersion,
  findDeckById,
  createDefaultSpot,
  createDefaultSpotCalibration
}) {
  let createdSpot = null;
  const targetDeck = updateDraftDeck(
    mapStore,
    deckId,
    (draftDeck) => {
      const nextSpot = {
        ...createDefaultSpot((draftDeck.spots?.length ?? 0) + 1),
        ...(spot ?? {})
      };

      nextSpot.calibration = {
        ...createDefaultSpotCalibration(),
        ...(draftDeck.calibration ?? {}),
        ...(spot?.calibration ?? {}),
        origin: {
          ...(draftDeck.calibration?.origin ?? { x: 240, y: 640 }),
          ...(spot?.calibration?.origin ?? {})
        }
      };

      createdSpot = nextSpot;
      draftDeck.spots = [...(draftDeck.spots ?? []), nextSpot];
    },
    touchDraftVersion,
    findDeckById
  );

  if (!targetDeck) {
    throw createMapStudioError(404, "Deck을 찾을 수 없습니다.");
  }

  return {
    targetDeck,
    spot: createdSpot
  };
}

export function deleteDraftSpot({
  mapStore,
  deckId,
  spotId,
  updateDraftDeck,
  touchDraftVersion,
  findDeckById
}) {
  const targetDeck = updateDraftDeck(
    mapStore,
    deckId,
    (draftDeck) => {
      draftDeck.spots = (draftDeck.spots ?? []).filter((spot) => spot.id !== spotId);
    },
    touchDraftVersion,
    findDeckById
  );

  if (!targetDeck) {
    throw createMapStudioError(404, "Deck을 찾을 수 없습니다.");
  }

  return targetDeck;
}

export function createDraftNoGoZone({
  mapStore,
  deckId,
  zone,
  updateDraftDeck,
  touchDraftVersion,
  findDeckById,
  createDefaultNoGo
}) {
  let createdZone = null;
  const targetDeck = updateDraftDeck(
    mapStore,
    deckId,
    (draftDeck) => {
      createdZone = {
        ...createDefaultNoGo((draftDeck.noGoZones?.length ?? 0) + 1),
        ...(zone ?? {})
      };
      draftDeck.noGoZones = [
        ...(draftDeck.noGoZones ?? []),
        createdZone
      ];
    },
    touchDraftVersion,
    findDeckById
  );

  if (!targetDeck) {
    throw createMapStudioError(404, "Deck을 찾을 수 없습니다.");
  }

  return {
    targetDeck,
    zone: createdZone
  };
}

export function deleteDraftNoGoZone({
  mapStore,
  deckId,
  zoneId,
  updateDraftDeck,
  touchDraftVersion,
  findDeckById
}) {
  const targetDeck = updateDraftDeck(
    mapStore,
    deckId,
    (draftDeck) => {
      draftDeck.noGoZones = (draftDeck.noGoZones ?? []).filter((zone) => zone.id !== zoneId);
    },
    touchDraftVersion,
    findDeckById
  );

  if (!targetDeck) {
    throw createMapStudioError(404, "Deck을 찾을 수 없습니다.");
  }

  return targetDeck;
}

export function createDraftDock({
  mapStore,
  deckId,
  dock,
  updateDraftDeck,
  touchDraftVersion,
  findDeckById,
  createDefaultDock
}) {
  const kind = dock?.kind === "vertical" ? "vertical" : "dock";
  let createdDock = null;
  const targetDeck = updateDraftDeck(
    mapStore,
    deckId,
    (draftDeck) => {
      if (kind === "vertical") {
        createdDock = {
          ...createDefaultDock((draftDeck.portals?.length ?? 0) + 1, "vertical"),
          ...(dock ?? {})
        };
        draftDeck.portals = [
          ...(draftDeck.portals ?? []),
          createdDock
        ];
        return;
      }

      createdDock = {
        ...createDefaultDock((draftDeck.docks?.length ?? 0) + 1, "dock"),
        ...(dock ?? {})
      };
      draftDeck.docks = [
        ...(draftDeck.docks ?? []),
        createdDock
      ];
    },
    touchDraftVersion,
    findDeckById
  );

  if (!targetDeck) {
    throw createMapStudioError(404, "Deck을 찾을 수 없습니다.");
  }

  return {
    targetDeck,
    kind,
    dock: createdDock
  };
}

export function deleteDraftDock({
  mapStore,
  deckId,
  dockId,
  kind,
  updateDraftDeck,
  touchDraftVersion,
  findDeckById
}) {
  const normalizedKind = kind === "vertical" ? "vertical" : "dock";
  const targetDeck = updateDraftDeck(
    mapStore,
    deckId,
    (draftDeck) => {
      if (normalizedKind === "vertical") {
        draftDeck.portals = (draftDeck.portals ?? []).filter((dock) => dock.id !== dockId);
        return;
      }

      draftDeck.docks = (draftDeck.docks ?? []).filter((dock) => dock.id !== dockId);
    },
    touchDraftVersion,
    findDeckById
  );

  if (!targetDeck) {
    throw createMapStudioError(404, "Deck을 찾을 수 없습니다.");
  }

  return {
    targetDeck,
    kind: normalizedKind
  };
}

export async function saveDraftMapImage({
  mapStore,
  deckId,
  spotId = "",
  fileName,
  dataUrl,
  width,
  height,
  mapAssetsDir,
  findDeckById,
  touchDraftVersion
}) {
  const targetDeck = findDeckById(mapStore.draft, deckId);

  if (!targetDeck) {
    throw createMapStudioError(404, "Deck을 찾을 수 없습니다.");
  }

  const targetSpot = spotId
    ? (targetDeck.spots ?? []).find((spot) => spot.id === spotId) ?? null
    : null;

  if (spotId && !targetSpot) {
    throw createMapStudioError(404, "Spot을 찾을 수 없습니다.");
  }

  const { mimeType, buffer } = decodeBase64DataUrl(dataUrl);
  const normalizedMimeType = mimeType || getMapAssetMimeType(fileName);
  const extension = getMapAssetExtension(fileName, normalizedMimeType);
  const baseName = path.parse(String(fileName || "")).name || `${spotId ? "spot" : "deck"}-image`;
  const scope = spotId ? `spot-${spotId}` : "deck";
  const serverFileName = `${slugify(deckId)}-${scope}-${Date.now()}-${slugify(baseName) || "image"}${extension}`;
  const serverRelativePath = `/map-assets/${serverFileName}`;

  await fs.writeFile(path.join(mapAssetsDir, serverFileName), buffer);

  const nextImage = {
    name: baseName,
    fileName: String(fileName || `${baseName}${extension}`),
    width: Number.isFinite(Number(width)) && Number(width) > 0 ? Number(width) : 1600,
    height: Number.isFinite(Number(height)) && Number(height) > 0 ? Number(height) : 900,
    src: serverRelativePath,
    serverSrc: serverRelativePath
  };

  if (targetSpot) {
    targetSpot.image = {
      ...(targetSpot.image ?? {}),
      ...nextImage
    };
  } else {
    targetDeck.image = {
      ...(targetDeck.image ?? {}),
      ...nextImage
    };
  }

  touchDraftVersion();

  return {
    message: targetSpot ? "Spot 이미지를 저장했습니다." : "Deck 이미지를 저장했습니다."
  };
}
