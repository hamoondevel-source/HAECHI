import cors from "cors";
import express from "express";
import fs from "fs/promises";
import path from "path";
import accounts from "./data/accounts.json" with { type: "json" };
import maps from "./data/maps.json" with { type: "json" };
import robots from "./data/robots.json" with { type: "json" };
import {
  applyDockPatch,
  applyDeckMetadataPatch,
  applyNoGoPatch,
  applySpotPatch,
  applyStudioDeckPatch,
  createDraftDeck,
  createDraftDock,
  createDraftNoGoZone,
  createDraftSpot,
  deleteDraftDeck,
  deleteDraftDock,
  deleteDraftNoGoZone,
  deleteDraftSpot,
  publishDraftMap,
  renameDraftDomain,
  saveDraftMapImage,
  updateDraftDeck
} from "./services/mapStudioService.js";
import teams from "./data/teams.json" with { type: "json" };
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 6000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAPS_DATA_PATH = path.join(__dirname, "data", "maps.json");
const MAP_ASSETS_DIR = path.join(__dirname, "data", "map-assets");

app.use(cors());
app.use(express.json({ limit: "20mb" }));
await fs.mkdir(MAP_ASSETS_DIR, { recursive: true });
app.use("/map-assets", express.static(MAP_ASSETS_DIR));

const BOARD_LIMIT = {
  minX: 24,
  maxX: 940,
  minY: 24,
  maxY: 520
};

const accountStore = accounts.map((account) => ({
  ...account,
  teamId: account.teamId ?? null,
  node: account.node ?? { x: 180, y: 180 }
}));

const mapStore = structuredClone(maps);
const teamStore = teams.map((team) => ({
  ...team,
  node: team.node ?? { x: 80, y: 80 }
}));

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function createDefaultGridCalibration(origin = { x: 240, y: 640 }) {
  return {
    origin,
    resolution: 0.05,
    rotation: 0,
    gridMeters: 1,
    gridColor: "#8a929d",
    gridOpacity: 0.26,
    gridCount: 20
  };
}

async function writeJsonAtomic(targetPath, value) {
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const tempPath = `${targetPath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

    try {
      await fs.writeFile(tempPath, payload, "utf8");
      await fs.rename(tempPath, targetPath);
      return;
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => {});

      if (attempt === 2) {
        throw error;
      }
    }
  }
}

async function persistMaps() {
  await writeJsonAtomic(MAPS_DATA_PATH, mapStore);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeNode(node) {
  const fallback = { x: BOARD_LIMIT.minX, y: BOARD_LIMIT.minY };
  const x = Number.isFinite(node?.x) ? node.x : fallback.x;
  const y = Number.isFinite(node?.y) ? node.y : fallback.y;

  return {
    x: clamp(Math.round(x), BOARD_LIMIT.minX, BOARD_LIMIT.maxX),
    y: clamp(Math.round(y), BOARD_LIMIT.minY, BOARD_LIMIT.maxY)
  };
}

function findAccountById(accountId) {
  return accountStore.find((account) => account.id === accountId);
}

function findTeamById(teamId) {
  return teamStore.find((team) => team.id === teamId);
}

function findDeckById(mapDocument, deckId) {
  return mapDocument?.decks?.find((deck) => deck.id === deckId) ?? null;
}

function resolveTeamName(teamId) {
  if (!teamId) {
    return null;
  }

  return findTeamById(teamId)?.name ?? null;
}

function getVisibleAccountsForViewer(viewer) {
  if (!viewer) {
    return [];
  }

  if (viewer.role === "root") {
    return accountStore;
  }

  if (viewer.role === "operator") {
    if (!viewer.teamId) {
      return [viewer];
    }

    return accountStore.filter(
      (account) => account.id === viewer.id || account.teamId === viewer.teamId
    );
  }

  return accountStore.filter((account) => account.id === viewer.id);
}

function getVisibleTeamsForViewer(viewer) {
  if (!viewer) {
    return [];
  }

  if (viewer.role === "root") {
    return teamStore;
  }

  if (viewer.teamId) {
    const team = findTeamById(viewer.teamId);
    return team ? [team] : [];
  }

  return [];
}

function requireRootActor(actorId, res) {
  const actor = findAccountById(actorId);

  if (!actor) {
    res.status(404).json({ message: "작업 계정을 찾을 수 없습니다." });
    return null;
  }

  if (actor.role !== "root") {
    res.status(403).json({ message: "관리자 권한이 필요합니다." });
    return null;
  }

  return actor;
}

function getRobotCount(account) {
  return account.allowedRobotIds ? account.allowedRobotIds.length : robots.length;
}

function serializeProfile(account) {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
    email: account.email,
    badge: account.badge,
    status: account.status,
    heartbeat: account.heartbeat,
    permissionSummary: account.permissionSummary,
    description: account.description,
    assignedRobotCount: getRobotCount(account),
    teamId: account.teamId,
    teamName: resolveTeamName(account.teamId)
  };
}

function serializeSession(account) {
  const teamName = resolveTeamName(account.teamId);

  let scopeLabel = "개인 조회 권한";

  if (account.role === "root") {
    scopeLabel = "전체 시스템 접근";
  } else if (account.role === "operator") {
    scopeLabel = teamName ? `${teamName} 계정 및 장비 접근` : "할당된 팀 장비 접근";
  }

  return {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
    email: account.email,
    badge: account.badge,
    status: account.status,
    heartbeat: account.heartbeat,
    permissionSummary: account.permissionSummary,
    description: account.description,
    permissions: account.permissions,
    zones: account.zones,
    allowedRobotIds: account.allowedRobotIds,
    teamId: account.teamId,
    teamName,
    scopeLabel
  };
}

function serializeAccountStatus(account) {
  return {
    id: account.id,
    name: account.name,
    role: account.role,
    email: account.email,
    badge: account.badge,
    status: account.status,
    heartbeat: account.heartbeat,
    permissionSummary: account.permissionSummary,
    assignedRobotCount: getRobotCount(account),
    teamId: account.teamId,
    teamName: resolveTeamName(account.teamId)
  };
}

function serializeTeam(team) {
  const memberCount = accountStore.filter((account) => account.teamId === team.id).length;

  return {
    id: team.id,
    name: team.name,
    code: team.code,
    memberCount,
    node: sanitizeNode(team.node)
  };
}

function serializeGraphAccount(account) {
  return {
    id: account.id,
    name: account.name,
    role: account.role,
    badge: account.badge,
    teamId: account.teamId,
    teamName: resolveTeamName(account.teamId),
    node: sanitizeNode(account.node)
  };
}

function getAccessibleSpotIds(viewer, mapDocument) {
  if (!viewer || !mapDocument) {
    return [];
  }

  if (viewer.role === "root" || viewer.zones.includes("전 구역")) {
    return mapDocument.decks.flatMap((deck) => deck.spots.map((spot) => spot.id));
  }

  const allowedZones = new Set(viewer.zones);

  return mapDocument.decks.flatMap((deck) =>
    deck.spots.filter((spot) => allowedZones.has(spot.zoneKey)).map((spot) => spot.id)
  );
}

function serializeDeck(deck) {
  return {
    id: deck.id,
    label: deck.label,
    name: deck.name,
    elevation: deck.elevation,
    image: deck.image,
    calibration: deck.calibration,
    spots: deck.spots,
    noGoZones: deck.noGoZones,
    docks: deck.docks,
    portals: deck.portals
  };
}

function serializeMapDocument(mapDocument) {
  return {
    id: mapDocument.id,
    name: mapDocument.name,
    status: mapDocument.status,
    version: mapDocument.version,
    updatedAt: mapDocument.updatedAt,
    activeDeckId: mapDocument.activeDeckId,
    decks: mapDocument.decks.map(serializeDeck)
  };
}

function serializeStudioDomain(mapDocument) {
  return {
    id: mapDocument.id,
    name: mapDocument.name,
    status: mapDocument.status,
    version: mapDocument.version,
    updatedAt: mapDocument.updatedAt,
    activeDeckId: mapDocument.activeDeckId
  };
}

function serializeStudioDeckOption(deck) {
  return {
    id: deck.id,
    label: deck.label,
    name: deck.name
  };
}

function serializeStudioDeckBundle(mapDocument, deckId) {
  const deck = findDeckById(mapDocument, deckId);

  if (!deck) {
    return null;
  }

  return {
    domain: serializeStudioDomain(mapDocument),
    deck: serializeDeck(deck),
    availableDecks: mapDocument.decks.map(serializeStudioDeckOption)
  };
}

function touchDraftVersion() {
  mapStore.draft.updatedAt = new Date().toISOString();
  mapStore.draft.version = `draft-${new Date().toISOString()}`;
}

function createDefaultDeck(index = 1) {
  const deckId = createId("deck");
  const label = `L${index}`;
  const calibration = createDefaultGridCalibration({ x: 240, y: 640 });
  return {
    id: deckId,
    label,
    name: `새 Deck ${index}`,
    elevation: 0,
    image: {
      name: `${deckId}-map`,
      src: null,
      width: 1600,
      height: 900
    },
    calibration,
    spots: [],
    noGoZones: [],
    docks: [],
    portals: []
  };
}

function createDefaultSpotCalibration() {
  return createDefaultGridCalibration({ x: 240, y: 640 });
}

function createDefaultSpot(index = 1) {
  const spotId = createId("spot");
  return {
    id: spotId,
    name: `New Spot ${index}`,
    kind: "spot",
    zoneKey: `Spot ${index}`,
    x: 160 + index * 24,
    y: 160 + index * 18,
    width: 240,
    height: 160,
    calibration: createDefaultSpotCalibration()
  };
}

function createDefaultNoGo(index = 1) {
  return {
    id: createId("nogo"),
    name: `Restricted ${index}`,
    x: 960,
    y: 180 + index * 20,
    width: 160,
    height: 120
  };
}

function createDefaultDock(index = 1, kind = "dock") {
  return {
    id: createId(kind === "vertical" ? "portal" : "dock"),
    name: kind === "vertical" ? `Portal ${index}` : `Dock ${index}`,
    kind,
    x: 760,
    y: 620 + index * 8,
    ...(kind === "vertical" ? { targetDeckId: null } : {})
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    service: "HAECHI backend",
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/auth/profiles", (_req, res) => {
  res.json({
    roles: [
      { role: "root", title: "관리자", summary: "전체 계정 및 팀 관리" },
      { role: "operator", title: "운영자", summary: "할당된 팀 계정 열람" },
      { role: "monitor", title: "모니터", summary: "개인 상태 조회" }
    ]
  });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body ?? {};
  const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedUsername || !normalizedPassword) {
    res.status(400).json({ message: "아이디와 비밀번호를 입력하세요." });
    return;
  }

  const account = accountStore.find((item) => item.username.toLowerCase() === normalizedUsername);

  if (!account) {
    res.status(404).json({ message: "계정을 찾을 수 없습니다." });
    return;
  }

  if (account.password !== normalizedPassword) {
    res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  res.json({
    session: serializeSession(account),
    loggedInAt: new Date().toISOString()
  });
});

app.get("/api/accounts/status", (req, res) => {
  const viewerId = typeof req.query.viewerId === "string" ? req.query.viewerId : "";

  if (!viewerId) {
    res.status(400).json({ message: "viewerId가 필요합니다." });
    return;
  }

  const viewer = findAccountById(viewerId);

  if (!viewer) {
    res.status(404).json({ message: "조회 계정을 찾을 수 없습니다." });
    return;
  }

  res.json({
    accounts: getVisibleAccountsForViewer(viewer).map(serializeAccountStatus)
  });
});

app.get("/api/teams/graph", (req, res) => {
  const viewerId = typeof req.query.viewerId === "string" ? req.query.viewerId : "";

  if (!viewerId) {
    res.status(400).json({ message: "viewerId가 필요합니다." });
    return;
  }

  const viewer = findAccountById(viewerId);

  if (!viewer) {
    res.status(404).json({ message: "조회 계정을 찾을 수 없습니다." });
    return;
  }

  const visibleTeams = getVisibleTeamsForViewer(viewer);
  const visibleAccounts = getVisibleAccountsForViewer(viewer);

  res.json({
    teams: visibleTeams.map(serializeTeam),
    accounts: visibleAccounts.map(serializeGraphAccount)
  });
});

app.get("/api/maps/monitor", (req, res) => {
  const viewerId = typeof req.query.viewerId === "string" ? req.query.viewerId : "";

  if (!viewerId) {
    res.status(400).json({ message: "viewerId가 필요합니다." });
    return;
  }

  const viewer = findAccountById(viewerId);

  if (!viewer) {
    res.status(404).json({ message: "조회 계정을 찾을 수 없습니다." });
    return;
  }

  res.json({
    map: serializeMapDocument(mapStore.published),
    accessibleSpotIds: getAccessibleSpotIds(viewer, mapStore.published)
  });
});

app.get("/api/maps/studio/decks/:deckId", (req, res) => {
  const viewerId = typeof req.query.viewerId === "string" ? req.query.viewerId : "";

  if (!viewerId) {
    res.status(400).json({ message: "viewerId가 필요합니다." });
    return;
  }

  const viewer = findAccountById(viewerId);

  if (!viewer) {
    res.status(404).json({ message: "조회 계정을 찾을 수 없습니다." });
    return;
  }

  const studioBundle = serializeStudioDeckBundle(mapStore.draft, req.params.deckId);

  if (!studioBundle) {
    res.status(404).json({ message: "조회할 Deck을 찾을 수 없습니다." });
    return;
  }

  res.json({
    canEdit: viewer.role === "root",
    ...studioBundle
  });
});

app.get("/api/maps/library", (req, res) => {
  const viewerId = typeof req.query.viewerId === "string" ? req.query.viewerId : "";

  if (!viewerId) {
    res.status(400).json({ message: "viewerId가 필요합니다." });
    return;
  }

  const viewer = findAccountById(viewerId);

  if (!viewer) {
    res.status(404).json({ message: "조회 계정을 찾을 수 없습니다." });
    return;
  }

  const draft = serializeMapDocument(mapStore.draft);

  res.json({
    canEdit: viewer.role === "root",
    domain: {
      id: draft.id,
      name: draft.name,
      status: draft.status,
      version: draft.version,
      updatedAt: draft.updatedAt
    },
    decks: draft.decks.map((deck) => ({
      id: deck.id,
      label: deck.label,
      name: deck.name,
      elevation: deck.elevation,
      image: deck.image,
      calibration: deck.calibration,
      counts: {
        spots: deck.spots?.length ?? 0,
        noGoZones: deck.noGoZones?.length ?? 0,
        docks: deck.docks?.length ?? 0,
        portals: deck.portals?.length ?? 0
      },
      spots: deck.spots ?? [],
      noGoZones: deck.noGoZones ?? [],
      docks: deck.docks ?? [],
      portals: deck.portals ?? []
    }))
  });
});

app.patch("/api/maps/decks/:deckId", async (req, res) => {
  const { actorId, patch } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  const updatedDeck = updateDraftDeck(
    mapStore,
    req.params.deckId,
    (draftDeck) => applyDeckMetadataPatch(draftDeck, patch, createDefaultGridCalibration),
    touchDraftVersion,
    findDeckById
  );

  if (!updatedDeck) {
    res.status(404).json({ message: "수정할 Deck을 찾을 수 없습니다." });
    return;
  }

  await persistMaps();

  res.json({
    message: "Deck 정보를 저장했습니다.",
    domain: serializeStudioDomain(mapStore.draft),
    deck: serializeDeck(updatedDeck)
  });
});

app.patch("/api/maps/studio/decks/:deckId", async (req, res) => {
  const { actorId, patch } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  if (!patch) {
    res.status(400).json({ message: "patch가 필요합니다." });
    return;
  }

  const updatedDeck = updateDraftDeck(
    mapStore,
    req.params.deckId,
    (draftDeck) => applyStudioDeckPatch(draftDeck, patch),
    touchDraftVersion,
    findDeckById
  );

  if (!updatedDeck) {
    res.status(404).json({ message: "수정할 Deck을 찾을 수 없습니다." });
    return;
  }

  if (req.params.deckId === mapStore.draft.activeDeckId || !mapStore.draft.activeDeckId) {
    mapStore.draft.activeDeckId = req.params.deckId;
  }

  await persistMaps();

  res.json({
    message: "맵 스튜디오 초안이 저장되었습니다.",
    ...serializeStudioDeckBundle(mapStore.draft, req.params.deckId)
  });
});

app.patch("/api/maps/studio/decks/:deckId/spots/:spotId", async (req, res) => {
  const { actorId, patch } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  const updatedDeck = updateDraftDeck(
    mapStore,
    req.params.deckId,
    (draftDeck) => applySpotPatch(draftDeck, req.params.spotId, patch),
    touchDraftVersion,
    findDeckById
  );

  if (!updatedDeck) {
    res.status(404).json({ message: "Deck을 찾을 수 없습니다." });
    return;
  }

  const targetSpot = updatedDeck.spots?.find((spot) => spot.id === req.params.spotId) ?? null;

  if (!targetSpot) {
    res.status(404).json({ message: "수정할 Spot을 찾을 수 없습니다." });
    return;
  }

  await persistMaps();

  res.json({
    message: "Spot 정보를 저장했습니다.",
    ...serializeStudioDeckBundle(mapStore.draft, req.params.deckId),
    spot: targetSpot
  });
});

app.patch("/api/maps/studio/decks/:deckId/nogo-zones/:zoneId", async (req, res) => {
  const { actorId, patch } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  const updatedDeck = updateDraftDeck(
    mapStore,
    req.params.deckId,
    (draftDeck) => applyNoGoPatch(draftDeck, req.params.zoneId, patch),
    touchDraftVersion,
    findDeckById
  );

  if (!updatedDeck) {
    res.status(404).json({ message: "Deck을 찾을 수 없습니다." });
    return;
  }

  const targetZone = updatedDeck.noGoZones?.find((zone) => zone.id === req.params.zoneId) ?? null;

  if (!targetZone) {
    res.status(404).json({ message: "수정할 금지 구역을 찾을 수 없습니다." });
    return;
  }

  await persistMaps();

  res.json({
    message: "금지 구역 정보를 저장했습니다.",
    ...serializeStudioDeckBundle(mapStore.draft, req.params.deckId),
    zone: targetZone
  });
});

app.patch("/api/maps/studio/decks/:deckId/docks/:dockId", async (req, res) => {
  const { actorId, patch } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  const updatedDeck = updateDraftDeck(
    mapStore,
    req.params.deckId,
    (draftDeck) => applyDockPatch(draftDeck, req.params.dockId, patch),
    touchDraftVersion,
    findDeckById
  );

  if (!updatedDeck) {
    res.status(404).json({ message: "Deck을 찾을 수 없습니다." });
    return;
  }

  const targetDock =
    [...(updatedDeck.docks ?? []), ...(updatedDeck.portals ?? [])].find(
      (dock) => dock.id === req.params.dockId
    ) ?? null;

  if (!targetDock) {
    res.status(404).json({ message: "수정할 Dock/Portal을 찾을 수 없습니다." });
    return;
  }

  await persistMaps();

  res.json({
    message: targetDock.kind === "vertical" ? "Portal 정보를 저장했습니다." : "Dock 정보를 저장했습니다.",
    ...serializeStudioDeckBundle(mapStore.draft, req.params.deckId),
    dock: targetDock
  });
});

app.post("/api/maps/studio/decks/:deckId/image", async (req, res) => {
  const { actorId, spotId, fileName, dataUrl, width, height } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  if (!dataUrl) {
    res.status(400).json({ message: "이미지 데이터가 필요합니다." });
    return;
  }

  try {
    const result = await saveDraftMapImage({
      mapStore,
      deckId: req.params.deckId,
      spotId,
      fileName,
      dataUrl,
      width,
      height,
      mapAssetsDir: MAP_ASSETS_DIR,
      findDeckById,
      touchDraftVersion
    });
    await persistMaps();

    res.json({
      message: result.message,
      ...serializeStudioDeckBundle(mapStore.draft, req.params.deckId)
    });
  } catch (error) {
    res.status(error?.statusCode ?? 400).json({
      message: error instanceof Error ? error.message : "이미지 저장에 실패했습니다."
    });
  }
});

app.post("/api/maps/studio/decks/:deckId/spots", async (req, res) => {
  const { actorId, spot } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  try {
    const result = createDraftSpot({
      mapStore,
      deckId: req.params.deckId,
      spot,
      updateDraftDeck,
      touchDraftVersion,
      findDeckById,
      createDefaultSpot,
      createDefaultSpotCalibration
    });
    await persistMaps();

    res.status(201).json({
      message: "Spot을 추가했습니다.",
      ...serializeStudioDeckBundle(mapStore.draft, req.params.deckId),
      spot: result.spot
    });
  } catch (error) {
    res.status(error?.statusCode ?? 400).json({
      message: error instanceof Error ? error.message : "Spot을 추가하지 못했습니다."
    });
  }
});

app.delete("/api/maps/studio/decks/:deckId/spots/:spotId", async (req, res) => {
  const actorId = typeof req.body?.actorId === "string" ? req.body.actorId : "";
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  try {
    deleteDraftSpot({
      mapStore,
      deckId: req.params.deckId,
      spotId: req.params.spotId,
      updateDraftDeck,
      touchDraftVersion,
      findDeckById
    });
    await persistMaps();

    res.json({
      message: "Spot을 삭제했습니다.",
      ...serializeStudioDeckBundle(mapStore.draft, req.params.deckId),
      removedId: req.params.spotId
    });
  } catch (error) {
    res.status(error?.statusCode ?? 400).json({
      message: error instanceof Error ? error.message : "Spot을 삭제하지 못했습니다."
    });
  }
});

app.post("/api/maps/studio/decks/:deckId/nogo-zones", async (req, res) => {
  const { actorId, zone } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  try {
    const result = createDraftNoGoZone({
      mapStore,
      deckId: req.params.deckId,
      zone,
      updateDraftDeck,
      touchDraftVersion,
      findDeckById,
      createDefaultNoGo
    });
    await persistMaps();

    res.status(201).json({
      message: "금지 구역을 추가했습니다.",
      ...serializeStudioDeckBundle(mapStore.draft, req.params.deckId),
      zone: result.zone
    });
  } catch (error) {
    res.status(error?.statusCode ?? 400).json({
      message: error instanceof Error ? error.message : "금지 구역을 추가하지 못했습니다."
    });
  }
});

app.delete("/api/maps/studio/decks/:deckId/nogo-zones/:zoneId", async (req, res) => {
  const actorId = typeof req.body?.actorId === "string" ? req.body.actorId : "";
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  try {
    deleteDraftNoGoZone({
      mapStore,
      deckId: req.params.deckId,
      zoneId: req.params.zoneId,
      updateDraftDeck,
      touchDraftVersion,
      findDeckById
    });
    await persistMaps();

    res.json({
      message: "금지 구역을 삭제했습니다.",
      ...serializeStudioDeckBundle(mapStore.draft, req.params.deckId),
      removedId: req.params.zoneId
    });
  } catch (error) {
    res.status(error?.statusCode ?? 400).json({
      message: error instanceof Error ? error.message : "금지 구역을 삭제하지 못했습니다."
    });
  }
});

app.post("/api/maps/studio/decks/:deckId/docks", async (req, res) => {
  const { actorId, dock } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  try {
    const result = createDraftDock({
      mapStore,
      deckId: req.params.deckId,
      dock,
      updateDraftDeck,
      touchDraftVersion,
      findDeckById,
      createDefaultDock
    });
    await persistMaps();

    res.status(201).json({
      message: result.kind === "vertical" ? "Portal을 추가했습니다." : "Dock을 추가했습니다.",
      ...serializeStudioDeckBundle(mapStore.draft, req.params.deckId),
      dock: result.dock
    });
  } catch (error) {
    res.status(error?.statusCode ?? 400).json({
      message: error instanceof Error ? error.message : "Dock/Portal을 추가하지 못했습니다."
    });
  }
});

app.delete("/api/maps/studio/decks/:deckId/docks/:dockId", async (req, res) => {
  const { actorId, kind } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  try {
    const result = deleteDraftDock({
      mapStore,
      deckId: req.params.deckId,
      dockId: req.params.dockId,
      kind,
      updateDraftDeck,
      touchDraftVersion,
      findDeckById
    });
    await persistMaps();

    res.json({
      message: result.kind === "vertical" ? "Portal을 삭제했습니다." : "Dock을 삭제했습니다.",
      ...serializeStudioDeckBundle(mapStore.draft, req.params.deckId),
      removedId: req.params.dockId
    });
  } catch (error) {
    res.status(error?.statusCode ?? 400).json({
      message: error instanceof Error ? error.message : "Dock/Portal을 삭제하지 못했습니다."
    });
  }
});

app.patch("/api/maps/domain", async (req, res) => {
  const { actorId, name } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  try {
    renameDraftDomain(mapStore, name, touchDraftVersion);
    await persistMaps();

    res.json({
      message: "Domain 이름을 저장했습니다.",
      domain: serializeStudioDomain(mapStore.draft)
    });
  } catch (error) {
    res.status(error?.statusCode ?? 400).json({
      message: error instanceof Error ? error.message : "Domain 이름을 저장하지 못했습니다."
    });
  }
});

app.post("/api/maps/decks", async (req, res) => {
  const { actorId, label, name } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  try {
    const nextDeck = createDraftDeck({
      mapStore,
      label,
      name,
      createDefaultDeck,
      touchDraftVersion
    });
    await persistMaps();

    res.status(201).json({
      message: "Deck을 추가했습니다.",
      domain: serializeStudioDomain(mapStore.draft),
      deck: serializeDeck(nextDeck)
    });
  } catch (error) {
    res.status(error?.statusCode ?? 400).json({
      message: error instanceof Error ? error.message : "Deck을 추가하지 못했습니다."
    });
  }
});

app.delete("/api/maps/decks/:deckId", async (req, res) => {
  const actorId = typeof req.body?.actorId === "string" ? req.body.actorId : "";
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  try {
    const removedDeck = deleteDraftDeck({
      mapStore,
      deckId: req.params.deckId,
      touchDraftVersion
    });
    await persistMaps();

    res.json({
      message: "Deck을 삭제했습니다.",
      domain: serializeStudioDomain(mapStore.draft),
      removedId: removedDeck.id,
      removedType: "deck"
    });
  } catch (error) {
    res.status(error?.statusCode ?? 400).json({
      message: error instanceof Error ? error.message : "Deck을 삭제하지 못했습니다."
    });
  }
});

app.post("/api/maps/publish", async (req, res) => {
  const { actorId } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  publishDraftMap(mapStore);
  await persistMaps();

  res.json({
    message: "맵 초안이 관제용 버전으로 배포되었습니다.",
    map: serializeMapDocument(mapStore.published)
  });
});

app.post("/api/teams", (req, res) => {
  const { actorId, name, code } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";

  if (!normalizedName || !normalizedCode) {
    res.status(400).json({ message: "팀 이름과 코드를 입력하세요." });
    return;
  }

  const teamId = `team-${Date.now().toString(36)}`;
  const nextTeam = {
    id: teamId,
    name: normalizedName,
    code: normalizedCode,
    node: sanitizeNode({
      x: 120 + teamStore.length * 30,
      y: 120 + teamStore.length * 24
    })
  };

  teamStore.push(nextTeam);

  res.status(201).json({
    team: serializeTeam(nextTeam),
    message: "팀이 생성되었습니다."
  });
});

app.patch("/api/teams/assign", (req, res) => {
  const { actorId, accountId, teamId } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  const account = findAccountById(accountId);

  if (!account) {
    res.status(404).json({ message: "계정을 찾을 수 없습니다." });
    return;
  }

  if (account.role === "root") {
    res.status(400).json({ message: "관리자 계정은 팀에 배정할 수 없습니다." });
    return;
  }

  if (teamId) {
    const team = findTeamById(teamId);

    if (!team) {
      res.status(404).json({ message: "팀을 찾을 수 없습니다." });
      return;
    }

    account.teamId = team.id;
    account.node = sanitizeNode({
      x: team.node.x + 240,
      y: team.node.y + 24
    });
  } else {
    account.teamId = null;
    account.node = sanitizeNode({
      x: 520,
      y: 260
    });
  }

  res.json({
    account: serializeAccountStatus(account),
    message: "팀 배정이 업데이트되었습니다."
  });
});

app.patch("/api/teams/node", (req, res) => {
  const { actorId, nodeType, nodeId, x, y } = req.body ?? {};
  const actor = requireRootActor(actorId, res);

  if (!actor) {
    return;
  }

  const nextNode = sanitizeNode({ x, y });

  if (nodeType === "team") {
    const team = findTeamById(nodeId);

    if (!team) {
      res.status(404).json({ message: "팀 노드를 찾을 수 없습니다." });
      return;
    }

    team.node = nextNode;
    res.json({ nodeType, nodeId, node: nextNode });
    return;
  }

  if (nodeType === "account") {
    const account = findAccountById(nodeId);

    if (!account) {
      res.status(404).json({ message: "계정 노드를 찾을 수 없습니다." });
      return;
    }

    account.node = nextNode;
    res.json({ nodeType, nodeId, node: nextNode });
    return;
  }

  res.status(400).json({ message: "지원하지 않는 노드 타입입니다." });
});

app.get("/api/robots", (_req, res) => {
  const summary = {
    total: robots.length,
    active: robots.filter((robot) => robot.status === "active").length,
    charging: robots.filter((robot) => robot.status === "charging").length,
    warning: robots.filter((robot) => robot.status === "warning").length,
    offline: robots.filter((robot) => robot.status === "offline").length
  };

  res.json({ summary, robots });
});

app.get("/api/robots/:id", (req, res) => {
  const robot = robots.find((item) => item.id === req.params.id);

  if (!robot) {
    res.status(404).json({ message: "Robot not found" });
    return;
  }

  res.json(robot);
});

app.listen(PORT, () => {
  console.log(`HAECHI backend listening on port ${PORT}`);
});
