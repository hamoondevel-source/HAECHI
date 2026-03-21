import { app, BrowserWindow, dialog, ipcMain, nativeImage } from "electron";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const isDev = !app.isPackaged;
const rendererUrl = "http://localhost:5173";
const studioWindows = new Map();
const mapsDataPath = path.join(repoRoot, "backend", "src", "data", "maps.json");
const backendMapAssetsPath = path.join(repoRoot, "backend", "src", "data", "map-assets");

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getLibraryRoot() {
  return path.join(app.getPath("documents"), "Haechi Map Library");
}

function getProjectId(domainId, folderName) {
  return `${domainId}::${folderName}`;
}

function createDefaultGridCalibration(origin = { x: 0, y: 0 }) {
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

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJsonWithRetry(jsonPath, retries = 4) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const raw = await fs.readFile(jsonPath, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      lastError = error;
      const isRetryable =
        error instanceof SyntaxError ||
        /Unexpected end of JSON input/i.test(error.message ?? "");

      if (!isRetryable || attempt === retries) {
        throw lastError;
      }

      await wait(80 * (attempt + 1));
    }
  }

  throw lastError;
}

async function readBackendMapStore() {
  return readJsonWithRetry(mapsDataPath);
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function toProjectRecord(domain, deck, status) {
  return {
    schemaVersion: 1,
    domainId: domain.id,
    domainName: domain.name,
    deckId: deck.id,
    label: deck.label,
    name: deck.name,
    status,
    version: domain.version,
    updatedAt: domain.updatedAt,
    elevation: deck.elevation ?? 0,
    image: {
      name: deck.image?.name ?? `${slugify(deck.name)}-image`,
      width: deck.image?.width ?? 1600,
      height: deck.image?.height ?? 900,
      fileName: deck.image?.fileName ?? null,
      serverSrc: deck.image?.src ?? deck.image?.serverSrc ?? null
    },
    calibration: deck.calibration ?? null,
    spots: deck.spots ?? [],
    noGoZones: deck.noGoZones ?? [],
    docks: deck.docks ?? [],
    portals: deck.portals ?? []
  };
}

async function ensureSeedLibrary() {
  const libraryRoot = getLibraryRoot();
  await ensureDir(libraryRoot);
  const mapSeed = await readBackendMapStore();

  // Desktop studio edits should always reflect the latest draft source.
  // Fall back to published only when draft is unavailable.
  const sourceDomain = mapSeed.draft ?? mapSeed.published ?? null;
  const domains = sourceDomain
    ? [{ source: sourceDomain, status: mapSeed.draft ? "draft" : "published" }]
    : [];

  for (const { source, status } of domains) {
    const domainFolderName = `${source.name}`;
    const domainPath = path.join(libraryRoot, domainFolderName);
    await ensureDir(domainPath);

    for (const deck of source.decks ?? []) {
      const folderName = `${deck.label}-${deck.name}`;
      const projectPath = path.join(domainPath, folderName);
      const assetsPath = path.join(projectPath, "assets");
      const projectFilePath = path.join(projectPath, "project.json");

      await ensureDir(projectPath);
      await ensureDir(assetsPath);

      if (!(await exists(projectFilePath))) {
        const record = toProjectRecord(source, deck, status);
        await writeJsonAtomic(projectFilePath, record);
      } else {
        const currentProject = await readJson(projectFilePath);
        const syncedRecord = {
          ...currentProject,
          ...toProjectRecord(source, deck, status),
          image: {
            ...toProjectRecord(source, deck, status).image,
            fileName: currentProject.image?.fileName ?? null
          }
        };

        await writeJsonAtomic(projectFilePath, syncedRecord);
      }
    }
  }
}

async function readJson(jsonPath) {
  return readJsonWithRetry(jsonPath);
}

async function writeJsonAtomic(targetPath, value) {
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  await ensureDir(path.dirname(targetPath));

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

async function resolveImageSource(projectPath, project, image, suffix = "deck") {
  if (!image) {
    return null;
  }

  if (image.serverSrc) {
    return image.serverSrc;
  }

  const fileName = image.fileName;

  if (!fileName) {
    return null;
  }

  const assetPath = path.join(projectPath, "assets", fileName);

  if (!(await exists(assetPath))) {
    return null;
  }

  await ensureDir(backendMapAssetsPath);
  const serverFileName = `${slugify(project.deckId ?? project.name ?? path.basename(projectPath))}-${suffix}-${fileName}`;
  const backendAssetPath = path.join(backendMapAssetsPath, serverFileName);

  if (!(await exists(backendAssetPath))) {
    await fs.copyFile(assetPath, backendAssetPath);
  }

  return `/map-assets/${serverFileName}`;
}

function resolveImageMimeType(fileName) {
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

async function resolveImagePreview(projectPath, project) {
  const fileName = project?.image?.fileName;

  if (!fileName) {
    return null;
  }

  const assetPath = path.join(projectPath, "assets", fileName);

  if (!(await exists(assetPath))) {
    return null;
  }

  const buffer = await fs.readFile(assetPath);
  const mimeType = resolveImageMimeType(fileName);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function resolveImageDescriptor(projectPath, project, image, suffix = "deck") {
  if (!image) {
    return null;
  }

  const source = await resolveImageSource(projectPath, project, image, suffix);
  const previewSrc = await resolveImagePreview(projectPath, { image });

  return {
    ...image,
    src: source ?? image.serverSrc ?? null,
    serverSrc: source ?? image.serverSrc ?? null,
    previewSrc
  };
}

async function readProjectByPath(projectPath) {
  const project = await readJson(path.join(projectPath, "project.json"));
  const image = await resolveImageDescriptor(projectPath, project, project.image, "deck");
  const spots = await Promise.all(
    (project.spots ?? []).map(async (spot) => ({
      ...spot,
      image: await resolveImageDescriptor(projectPath, project, spot.image ?? null, `spot-${spot.id}`)
    }))
  );

  return {
    ...project,
    image: image ?? project.image ?? null,
    spots
  };
}

async function findProjectPath(projectId) {
  const library = await serializeMapLibrary();
  const deckMatches = [];

  for (const domain of library.domains) {
    for (const entry of domain.projects) {
      if (entry.id === projectId) {
        return entry.path;
      }

      if (entry.deckId === projectId) {
        deckMatches.push(entry);
      }
    }
  }

  if (deckMatches.length) {
    const statusRank = (status) => {
      if (status === "draft") {
        return 0;
      }
      if (status === "published") {
        return 1;
      }
      return 2;
    };
    const getUpdatedAtValue = (value) => {
      const timestamp = Date.parse(value ?? "");
      return Number.isFinite(timestamp) ? timestamp : 0;
    };
    const preferredProject = [...deckMatches].sort((left, right) => {
      const statusDelta = statusRank(left.status) - statusRank(right.status);
      if (statusDelta !== 0) {
        return statusDelta;
      }

      return getUpdatedAtValue(right.updatedAt) - getUpdatedAtValue(left.updatedAt);
    })[0];

    return preferredProject.path;
  }

  throw new Error("맵 프로젝트를 찾을 수 없습니다.");
}

async function findDomainPath(domainId) {
  const library = await serializeMapLibrary();
  const domain = library.domains.find((item) => item.id === domainId);

  if (!domain) {
    throw new Error("Domain 폴더를 찾을 수 없습니다.");
  }

  return domain.path;
}

async function serializeMapLibrary() {
  await ensureSeedLibrary();
  const rootPath = getLibraryRoot();
  const domainEntries = await fs.readdir(rootPath, { withFileTypes: true });
  const domains = [];

  for (const domainEntry of domainEntries.filter((entry) => entry.isDirectory())) {
    const domainPath = path.join(rootPath, domainEntry.name);
    const projectEntries = await fs.readdir(domainPath, { withFileTypes: true });
    const rawProjects = [];

    for (const projectEntry of projectEntries.filter((entry) => entry.isDirectory())) {
      const projectPath = path.join(domainPath, projectEntry.name);
      const projectFilePath = path.join(projectPath, "project.json");

      if (!(await exists(projectFilePath))) {
        continue;
      }

      const project = await readJson(projectFilePath);
      const files = await fs.readdir(projectPath, { withFileTypes: true });
      const assetFiles = await fs.readdir(path.join(projectPath, "assets"), { withFileTypes: true }).catch(
        () => []
      );

      rawProjects.push({
        id: getProjectId(project.domainId, projectEntry.name),
        path: projectPath,
        folderName: projectEntry.name,
        name: project.name,
        displayName: `${project.label} ${project.name}`,
        label: project.label,
        status: project.status,
        version: project.version,
        updatedAt: project.updatedAt ?? "",
        deckId: project.deckId,
        spots: project.spots ?? [],
        portals: project.portals ?? [],
        itemCounts: {
          spots: project.spots?.length ?? 0,
          noGoZones: project.noGoZones?.length ?? 0,
          docks: (project.docks?.length ?? 0) + (project.portals?.length ?? 0)
        },
        files: [
          { name: "project.json", kind: "map" },
          { name: "assets", kind: "folder", count: assetFiles.length },
          ...assetFiles
            .filter((entry) => entry.isFile())
            .map((entry) => ({ name: entry.name, kind: "asset" })),
          ...files
            .filter((entry) => entry.isFile() && entry.name !== "project.json")
            .map((entry) => ({ name: entry.name, kind: "file" }))
        ]
      });
    }

    const deckToProjectMap = new Map(
      rawProjects.map((project) => [project.deckId, project])
    );
    const projects = rawProjects.map((project) => ({
      ...project,
      portalLinks: (project.portals ?? []).map((portal) => {
        const targetProject = deckToProjectMap.get(portal.targetDeckId);

        return {
          id: portal.id,
          name: portal.name,
          sourceProjectId: project.id,
          sourceDeckId: project.deckId,
          targetDeckId: portal.targetDeckId ?? null,
          targetProjectId: targetProject?.id ?? null,
          targetLabel: targetProject?.displayName ?? portal.targetDeckId ?? "미연결"
        };
      })
    }));

    domains.push({
      id: slugify(domainEntry.name),
      name: domainEntry.name,
      path: domainPath,
      projects
    });
  }

  return {
    rootPath,
    domains
  };
}

async function createMapProject(payload = {}) {
  await ensureSeedLibrary();

  const library = await serializeMapLibrary();
  const domain =
    library.domains.find((item) => item.id === payload.domainId) ?? library.domains[0];

  if (!domain) {
    throw new Error("대상 Domain 폴더를 찾을 수 없습니다.");
  }

  const projectName = payload.name?.trim() || `New Map ${domain.projects.length + 1}`;
  const folderName = payload.folderName?.trim() || slugify(projectName) || `map-${Date.now()}`;
  const projectPath = path.join(domain.path, folderName);

  if (await exists(projectPath)) {
    throw new Error("같은 이름의 맵 폴더가 이미 존재합니다.");
  }

  await ensureDir(projectPath);
  await ensureDir(path.join(projectPath, "assets"));

  const template = {
    schemaVersion: 1,
    domainId: slugify(domain.name),
    domainName: domain.name,
    deckId: folderName,
    label: payload.label?.trim() || "MAP",
    name: projectName,
    status: "draft",
    version: `draft-${new Date().toISOString().slice(0, 10)}`,
    updatedAt: new Date().toISOString(),
    elevation: 0,
    image: {
      name: `${folderName}-image`,
      width: 1600,
      height: 900,
      fileName: null
    },
    calibration: {
      ...createDefaultGridCalibration({ x: 0, y: 0 })
    },
    spots: [],
    noGoZones: [],
    docks: [],
    portals: []
  };

  await writeJsonAtomic(path.join(projectPath, "project.json"), template);

  return serializeMapLibrary();
}

function sanitizeProjectForSave(project) {
  const sanitizeImage = (image) =>
    image
      ? {
          ...image,
          src: undefined,
          previewSrc: undefined
        }
      : image;

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    image: sanitizeImage(project.image),
    spots: (project.spots ?? []).map((spot) => ({
      ...spot,
      image: sanitizeImage(spot.image)
    }))
  };
}

async function saveMapProject(payload = {}) {
  const projectId = payload?.projectId ?? "";
  const project = payload?.project ?? null;

  if (!projectId) {
    throw new Error("projectId가 필요합니다.");
  }

  if (!project) {
    throw new Error("저장할 프로젝트 데이터가 없습니다.");
  }

  const projectPath = await findProjectPath(projectId);
  const safeProject = sanitizeProjectForSave(project);
  const projectFilePath = path.join(projectPath, "project.json");
  await writeJsonAtomic(projectFilePath, safeProject);

  return readProjectByPath(projectPath);
}

async function pickMapImage(request, window) {
  const payload =
    typeof request === "string"
      ? { projectId: request, spotId: "" }
      : {
          projectId: request?.projectId ?? "",
          spotId: request?.spotId ?? ""
        };

  if (!payload.projectId) {
    throw new Error("projectId가 필요합니다.");
  }

  const projectPath = await findProjectPath(payload.projectId);
  const result = await dialog.showOpenDialog(window, {
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "svg"] }]
  });

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  const sourcePath = result.filePaths[0];
  const fileName = path.basename(sourcePath);
  const targetPath = path.join(projectPath, "assets", fileName);
  await fs.copyFile(sourcePath, targetPath);
  await ensureDir(backendMapAssetsPath);

  const project = await readProjectByPath(projectPath);
  const targetScope = payload.spotId ? `spot-${payload.spotId}` : "deck";
  const serverFileName = `${slugify(project.deckId ?? project.name)}-${targetScope}-${fileName}`;
  const backendAssetPath = path.join(backendMapAssetsPath, serverFileName);
  await fs.copyFile(sourcePath, backendAssetPath);
  const imageSize = nativeImage.createFromPath(sourcePath).getSize();
  const nextWidth = imageSize.width > 0 ? imageSize.width : 1600;
  const nextHeight = imageSize.height > 0 ? imageSize.height : 900;
  const nextImage = {
    name: path.parse(fileName).name,
    fileName,
    width: nextWidth,
    height: nextHeight,
    serverSrc: `/map-assets/${serverFileName}`
  };

  const updatedProject = {
    ...project,
    image: payload.spotId ? project.image : { ...project.image, ...nextImage },
    spots: (project.spots ?? []).map((spot) =>
      payload.spotId && spot.id === payload.spotId
        ? {
            ...spot,
            image: {
              ...(spot.image ?? {}),
              ...nextImage
            }
          }
        : spot
    )
  };

  if (payload.spotId && !(project.spots ?? []).some((spot) => spot.id === payload.spotId)) {
    throw new Error("이미지를 적용할 Spot을 찾을 수 없습니다.");
  }

  const projectFilePath = path.join(projectPath, "project.json");
  await writeJsonAtomic(projectFilePath, sanitizeProjectForSave(updatedProject));

  return readProjectByPath(projectPath);
}

async function renameDomain({ domainId, name }) {
  const normalizedName = String(name ?? "").trim();

  if (!normalizedName) {
    throw new Error("Domain 이름을 입력하세요.");
  }

  const currentPath = await findDomainPath(domainId);
  const targetPath = path.join(path.dirname(currentPath), normalizedName);

  if (currentPath !== targetPath && (await exists(targetPath))) {
    throw new Error("같은 이름의 Domain 폴더가 이미 존재합니다.");
  }

  if (currentPath !== targetPath) {
    await fs.rename(currentPath, targetPath);
  }

  const projectEntries = await fs.readdir(targetPath, { withFileTypes: true });

  for (const projectEntry of projectEntries.filter((entry) => entry.isDirectory())) {
    const projectPath = path.join(targetPath, projectEntry.name);
    const projectFilePath = path.join(projectPath, "project.json");

    if (!(await exists(projectFilePath))) {
      continue;
    }

    const project = await readJson(projectFilePath);
    const updatedProject = {
      ...project,
      domainId: slugify(normalizedName),
      domainName: normalizedName
    };

    await writeJsonAtomic(projectFilePath, updatedProject);
  }

  const library = await serializeMapLibrary();
  const selectedDomain = library.domains.find((item) => item.path === targetPath) ?? null;

  return {
    library,
    selectedDomainId: selectedDomain?.id ?? ""
  };
}

async function renameMapProject({ projectId, name }) {
  const normalizedName = String(name ?? "").trim();

  if (!normalizedName) {
    throw new Error("Deck 이름을 입력하세요.");
  }

  const currentPath = await findProjectPath(projectId);
  const project = await readProjectByPath(currentPath);
  const nextFolderName = slugify(normalizedName) || path.basename(currentPath);
  const targetPath = path.join(path.dirname(currentPath), nextFolderName);

  if (currentPath !== targetPath && (await exists(targetPath))) {
    throw new Error("같은 이름의 Deck 폴더가 이미 존재합니다.");
  }

  const updatedProject = sanitizeProjectForSave({
    ...project,
    name: normalizedName
  });

  const currentProjectFilePath = path.join(currentPath, "project.json");
  await writeJsonAtomic(currentProjectFilePath, updatedProject);

  if (currentPath !== targetPath) {
    await fs.rename(currentPath, targetPath);
  }

  const library = await serializeMapLibrary();
  const selectedProject =
    library.domains.flatMap((domain) => domain.projects ?? []).find((item) => item.path === targetPath) ?? null;

  return {
    library,
    selectedProjectId: selectedProject?.id ?? ""
  };
}

async function deleteMapProject(projectId) {
  const projectPath = await findProjectPath(projectId);
  await fs.rm(projectPath, { recursive: true, force: true });
  return serializeMapLibrary();
}

async function renameProjectSpot({ projectId, spotId, name }) {
  const normalizedName = String(name ?? "").trim();

  if (!normalizedName) {
    throw new Error("Spot 이름을 입력하세요.");
  }

  const projectPath = await findProjectPath(projectId);
  const project = await readProjectByPath(projectPath);
  const nextSpots = (project.spots ?? []).map((spot) =>
    spot.id === spotId ? { ...spot, name: normalizedName, zoneKey: spot.zoneKey ?? normalizedName } : spot
  );

  if (!nextSpots.some((spot) => spot.id === spotId)) {
    throw new Error("Spot을 찾을 수 없습니다.");
  }

  const projectFilePath = path.join(projectPath, "project.json");
  await writeJsonAtomic(projectFilePath, sanitizeProjectForSave({ ...project, spots: nextSpots }));

  return {
    library: await serializeMapLibrary(),
    selectedProjectId: projectId,
    selectedSpotId: spotId
  };
}

async function deleteProjectSpot({ projectId, spotId }) {
  const projectPath = await findProjectPath(projectId);
  const project = await readProjectByPath(projectPath);
  const nextSpots = (project.spots ?? []).filter((spot) => spot.id !== spotId);

  if (nextSpots.length === (project.spots ?? []).length) {
    throw new Error("삭제할 Spot을 찾을 수 없습니다.");
  }

  const projectFilePath = path.join(projectPath, "project.json");
  await writeJsonAtomic(projectFilePath, sanitizeProjectForSave({ ...project, spots: nextSpots }));

  return {
    library: await serializeMapLibrary(),
    selectedProjectId: projectId
  };
}

function getRendererTarget(search = "") {
  if (isDev) {
    return `${rendererUrl}/${search}`;
  }

  const indexPath = path.join(repoRoot, "frontend", "dist", "index.html");
  return `${pathToFileURL(indexPath).href}${search}`;
}

function attachWindowChromeState(window) {
  function emitState() {
    if (!window.isDestroyed()) {
      window.webContents.send("desktop:window-maximized-changed", window.isMaximized());
    }
  }

  window.on("maximize", emitState);
  window.on("unmaximize", emitState);
  window.on("enter-full-screen", emitState);
  window.on("leave-full-screen", emitState);
  window.webContents.on("did-finish-load", emitState);
}

function attachDevToolsShortcut(window) {
  if (app.isPackaged) {
    return;
  }

  window.webContents.on("before-input-event", (event, input) => {
    const isToggleCombo =
      input.type === "keyDown" &&
      (input.key === "F12" ||
        ((input.control || input.meta) && input.shift && String(input.key).toUpperCase() === "I"));

    if (!isToggleCombo) {
      return;
    }

    event.preventDefault();

    if (window.webContents.isDevToolsOpened()) {
      window.webContents.closeDevTools();
    } else {
      window.webContents.openDevTools({ mode: "detach" });
    }
  });
}

async function createMainWindow() {
  await ensureSeedLibrary();

  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 800,
    backgroundColor: "#17181b",
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  window.removeMenu();
  attachWindowChromeState(window);
  attachDevToolsShortcut(window);

  await window.loadURL(getRendererTarget("?desktop=1"));
}

async function createStudioWindow(request) {
  const payload =
    typeof request === "string"
      ? { projectId: request, focusType: "deck", focusId: "", actorId: "" }
      : {
          projectId: request?.projectId ?? "",
          focusType: request?.focusType ?? "deck",
          focusId: request?.focusId ?? "",
          actorId: request?.actorId ?? ""
        };
  const windowKey = `${payload.projectId}:${payload.focusType}:${payload.focusId}`;
  const existingWindow = studioWindows.get(windowKey);

  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.focus();
    return existingWindow;
  }

  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    parent: BrowserWindow.getFocusedWindow() ?? undefined,
    backgroundColor: "#17181b",
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  window.removeMenu();
  attachWindowChromeState(window);
  attachDevToolsShortcut(window);

  studioWindows.set(windowKey, window);
  window.on("closed", () => {
    studioWindows.delete(windowKey);
  });

  const query = new URLSearchParams({
    desktop: "1",
    view: "studio",
    projectId: payload.projectId
  });

  if (payload.focusType) {
    query.set("focusType", payload.focusType);
  }

  if (payload.focusId) {
    query.set("focusId", payload.focusId);
  }

  if (payload.actorId) {
    query.set("actorId", payload.actorId);
  }

  await window.loadURL(
    getRendererTarget(`?${query.toString()}`)
  );

  return window;
}

ipcMain.handle("desktop:get-map-library", async () => serializeMapLibrary());

ipcMain.handle("desktop:create-map-project", async (_event, payload) => createMapProject(payload));

ipcMain.handle("desktop:open-studio-window", async (_event, payload) => {
  await createStudioWindow(payload);
  return { ok: true };
});

ipcMain.handle("desktop:read-map-project", async (_event, projectId) => {
  const projectPath = await findProjectPath(projectId);
  return readProjectByPath(projectPath);
});

ipcMain.handle("desktop:save-map-project", async (_event, payload) => saveMapProject(payload));

ipcMain.handle("desktop:pick-map-image", async (event, payload) => {
  const ownerWindow = BrowserWindow.fromWebContents(event.sender);
  return pickMapImage(payload, ownerWindow ?? undefined);
});

ipcMain.handle("desktop:rename-domain", async (_event, payload) => renameDomain(payload));

ipcMain.handle("desktop:rename-map-project", async (_event, payload) => renameMapProject(payload));

ipcMain.handle("desktop:delete-map-project", async (_event, projectId) => deleteMapProject(projectId));

ipcMain.handle("desktop:rename-project-spot", async (_event, payload) => renameProjectSpot(payload));

ipcMain.handle("desktop:delete-project-spot", async (_event, payload) => deleteProjectSpot(payload));

ipcMain.handle("desktop:window-minimize", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  window?.minimize();
  return { ok: true };
});

ipcMain.handle("desktop:window-toggle-maximize", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);

  if (!window) {
    return { ok: false, isMaximized: false };
  }

  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }

  return { ok: true, isMaximized: window.isMaximized() };
});

ipcMain.handle("desktop:window-is-maximized", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  return { ok: Boolean(window), isMaximized: window?.isMaximized?.() ?? false };
});

ipcMain.handle("desktop:window-close", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  window?.close();
  return { ok: true };
});

app.whenReady().then(async () => {
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
