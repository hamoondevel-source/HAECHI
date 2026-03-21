import { useEffect, useRef, useState } from "react";
import {
  BsCollectionFill,
  BsDiagram3Fill,
  BsFileEarmarkImageFill,
  BsFileEarmarkTextFill,
  BsFolderFill,
  BsFolderPlus,
  BsGeoAltFill,
  BsMapFill,
  BsPencilSquare,
  BsSearch,
  BsTrash3
} from "react-icons/bs";
import logoImage from "../logo.png";
import ActionModal from "./components/ActionModal";
import ContextMenu from "./components/ContextMenu";
import DetailItem from "./components/DetailItem";
import DesktopStudioWindow from "./features/desktop-studio/DesktopStudioWindow";
import MapLibraryHierarchy from "./features/map-library/components/MapLibraryHierarchy";
import MapCanvas from "./features/spot-studio/components/MapCanvas";
import WindowTitleBar from "./components/WindowTitleBar";

const initialFleet = { summary: null, robots: [] };
const initialTeamGraph = { teams: [], accounts: [] };
const initialMonitorMap = { map: null, accessibleSpotIds: [] };
const initialStudioBundle = { canEdit: false, published: null, draft: null };
const DEFAULT_LOGIN_NOTICE = "로그인 후 계정의 역할과 팀에 따라 접근 범위가 자동 적용됩니다.";

const roleMeta = {
  root: {
    label: "ROOT",
    icon: "S",
    title: "관리자",
    summary: "전체 시스템 및 계정 상태",
    description: "모든 계정의 실시간 상태와 전체 로봇 플릿을 확인할 수 있습니다."
  },
  operator: {
    label: "OPS",
    icon: "W",
    title: "운영자",
    summary: "담당 구역 운용 및 경보 대응",
    description: "배정된 로봇과 구역에 대해서만 제어 및 대응 작업이 가능합니다."
  },
  monitor: {
    label: "MON",
    icon: "O",
    title: "모니터",
    summary: "조회 전용 통합 접근",
    description: "상태 조회와 로그 열람 중심의 읽기 전용 화면에 접근합니다."
  }
};

const robotStatusLabel = {
  active: "정상 운용",
  charging: "충전 중",
  warning: "점검 필요",
  offline: "오프라인"
};

const robotStatusClassName = {
  active: "is-active",
  charging: "is-charging",
  warning: "is-warning",
  offline: "is-offline"
};

const accountStatusLabel = {
  online: "온라인",
  idle: "대기",
  offline: "오프라인"
};

const accountStatusClassName = {
  online: "is-online",
  idle: "is-idle",
  offline: "is-offline"
};

const topNavConfig = [
  {
    key: "integrated",
    label: "통합",
    subItems: [
      { id: "overview", label: "개요", shortLabel: "OV", symbol: "O" },
      { id: "live", label: "실시간", shortLabel: "LV", symbol: "L" },
      { id: "alerts", label: "경보", shortLabel: "AL", symbol: "A" },
      { id: "sessions", label: "세션", shortLabel: "SS", symbol: "S" }
    ]
  },
  {
    key: "fleet",
    label: "플릿",
    subItems: [
      { id: "fleet-all", label: "전체 로봇", shortLabel: "FA", symbol: "F" },
      { id: "fleet-status", label: "상태별", shortLabel: "ST", symbol: "S" },
      { id: "fleet-charge", label: "충전", shortLabel: "CH", symbol: "C" },
      { id: "fleet-maint", label: "정비", shortLabel: "MT", symbol: "M" }
    ]
  },
  {
    key: "mission",
    label: "미션",
    subItems: [
      { id: "mission-queue", label: "미션 큐", shortLabel: "MQ", symbol: "Q" },
      { id: "mission-run", label: "실행 중", shortLabel: "RN", symbol: "R" },
      { id: "mission-template", label: "템플릿", shortLabel: "TP", symbol: "T" },
      { id: "mission-schedule", label: "예약", shortLabel: "SC", symbol: "S" }
    ]
  },
  {
    key: "map",
    label: "맵",
    subItems: [
      { id: "map-studio", label: "맵 스튜디오", shortLabel: "MS", symbol: "M" },
      { id: "map-zones", label: "구역", shortLabel: "ZN", symbol: "Z" },
      { id: "map-nogo", label: "금지구역", shortLabel: "NG", symbol: "N" },
      { id: "map-dock", label: "도킹", shortLabel: "DK", symbol: "D" }
    ]
  },
  {
    key: "event",
    label: "사건",
    subItems: [
      { id: "event-live", label: "실시간 사건", shortLabel: "EL", symbol: "E" },
      { id: "event-timeline", label: "타임라인", shortLabel: "TL", symbol: "T" },
      { id: "event-report", label: "리포트", shortLabel: "RP", symbol: "R" },
      { id: "event-export", label: "내보내기", shortLabel: "EX", symbol: "X" }
    ]
  },
  {
    key: "access",
    label: "권한·팀",
    subItems: [
      { id: "access-accounts", label: "계정", shortLabel: "AC", symbol: "A" },
      { id: "access-teams", label: "팀", shortLabel: "TM", symbol: "T" },
      { id: "access-graph", label: "노드 그래프", shortLabel: "GR", symbol: "G" },
      { id: "access-audit", label: "감사 로그", shortLabel: "AD", symbol: "D" }
    ]
  },
  {
    key: "settings",
    label: "설정",
    subItems: [
      { id: "settings-system", label: "시스템", shortLabel: "SY", symbol: "S" },
      { id: "settings-network", label: "네트워크", shortLabel: "NW", symbol: "N" },
      { id: "settings-integration", label: "연동", shortLabel: "IG", symbol: "I" },
      { id: "settings-policy", label: "보안 정책", shortLabel: "PL", symbol: "P" }
    ]
  }
];

const roleGuideItems = [
  {
    role: "root",
    title: "관리자",
    summary: "전체 계정·팀 구조 관리 및 실시간 운영 현황 총괄"
  },
  {
    role: "operator",
    title: "운영자",
    summary: "할당 팀 계정 열람, 담당 구역 로봇 운용·경보 대응"
  },
  {
    role: "monitor",
    title: "모니터",
    summary: "읽기 전용 상태 조회, 이력 확인 및 이상 상황 추적"
  }
];

function filterRobotsBySession(robots, session) {
  if (!session || !session.allowedRobotIds) {
    return robots;
  }

  return robots.filter((robot) => session.allowedRobotIds.includes(robot.id));
}

function summarizeRobots(robots) {
  return {
    total: robots.length,
    active: robots.filter((robot) => robot.status === "active").length,
    charging: robots.filter((robot) => robot.status === "charging").length,
    warning: robots.filter((robot) => robot.status === "warning").length,
    offline: robots.filter((robot) => robot.status === "offline").length
  };
}

function formatSyncTime(timestamp) {
  if (!timestamp) {
    return "-";
  }

  return new Date(timestamp).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getDeckById(mapDocument, deckId) {
  if (!mapDocument?.decks?.length) {
    return null;
  }

  return (
    mapDocument.decks.find((deck) => deck.id === deckId) ??
    mapDocument.decks.find((deck) => deck.id === mapDocument.activeDeckId) ??
    mapDocument.decks[0]
  );
}


function MacFolderIcon({ size = "sm" }) {
  return <BsFolderFill className={`mac-folder-icon size-${size}`} aria-hidden="true" />;
}

function FileGlyph({ kind = "file", size = "sm" }) {
  const Icon = kind === "map" ? BsMapFill : kind === "asset" ? BsFileEarmarkImageFill : BsFileEarmarkTextFill;
  return <Icon className={`file-glyph size-${size} kind-${kind}`} aria-hidden="true" />;
}

function HierarchyGlyph({ kind = "domain", size = "sm" }) {
  const Icon =
    kind === "deck" ? BsCollectionFill : kind === "spot" ? BsGeoAltFill : BsDiagram3Fill;
  return <Icon className={`hierarchy-glyph size-${size} kind-${kind}`} aria-hidden="true" />;
}


function getDesktopBridge() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.haechiDesktop ?? null;
}

function normalizeMapLibraryPayload(payload) {
  const domain = payload?.domain ?? null;
  const decks = payload?.decks ?? [];
  const deckMap = new Map(decks.map((deck) => [deck.id, deck]));

  const projects = decks.map((deck) => ({
    id: deck.id,
    path: "",
    folderName: `${deck.label}-${deck.name}`.replace(/\s+/g, "-"),
    name: deck.name,
    displayName: `${deck.label} ${deck.name}`,
    label: deck.label,
    status: domain?.status ?? "draft",
    version: domain?.version ?? "-",
    deckId: deck.id,
    elevation: deck.elevation,
    image: deck.image,
    calibration: deck.calibration,
    spots: deck.spots ?? [],
    noGoZones: deck.noGoZones ?? [],
    docks: deck.docks ?? [],
    portals: deck.portals ?? [],
    itemCounts: {
      spots: deck.counts?.spots ?? deck.spots?.length ?? 0,
      noGoZones: deck.counts?.noGoZones ?? deck.noGoZones?.length ?? 0,
      docks: (deck.counts?.docks ?? deck.docks?.length ?? 0) + (deck.counts?.portals ?? deck.portals?.length ?? 0)
    },
    files: [
      { name: `${deck.label.toLowerCase()}-${deck.name.replace(/\s+/g, "-").toLowerCase()}.map`, kind: "map" },
      { name: "assets", kind: "folder", count: deck.image?.name ? 1 : 0 },
      ...(deck.image?.name
        ? [{ name: `${deck.image.name}.png`, kind: "asset" }]
        : [])
    ]
  }));

  const projectsWithLinks = projects.map((project) => ({
    ...project,
    portalLinks: (project.portals ?? []).map((portal) => {
      const targetProject = projects.find((candidate) => candidate.deckId === portal.targetDeckId) ?? null;
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

  return {
    rootPath: "",
    domains: domain
      ? [
          {
            id: domain.id,
            name: domain.name,
            path: "",
            projects: projectsWithLinks
          }
        ]
      : []
  };
}

function App() {
  const desktopBridge = getDesktopBridge();
  const searchParams =
    typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const isDesktopStudioWindow = Boolean(
    desktopBridge?.isDesktop && searchParams.get("view") === "studio"
  );
  const desktopWindowProjectId = searchParams.get("projectId") ?? "";
  const desktopWindowFocusType = searchParams.get("focusType") ?? "deck";
  const desktopWindowFocusId = searchParams.get("focusId") ?? "";
  const desktopWindowActorId = searchParams.get("actorId") ?? "";
  const noticeTimerRef = useRef(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginNotice, setLoginNotice] = useState(DEFAULT_LOGIN_NOTICE);
  const [isLoginNoticeError, setIsLoginNoticeError] = useState(false);
  const [session, setSession] = useState(null);
  const [loginPending, setLoginPending] = useState(false);
  const [fleetData, setFleetData] = useState(initialFleet);
  const [visibleAccounts, setVisibleAccounts] = useState([]);
  const [teamGraph, setTeamGraph] = useState(initialTeamGraph);
  const [monitorMap, setMonitorMap] = useState(initialMonitorMap);
  const [studioBundle, setStudioBundle] = useState(initialStudioBundle);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [selectedRobotId, setSelectedRobotId] = useState("");
  const [lastSync, setLastSync] = useState("");
  const [activeTopTab, setActiveTopTab] = useState("integrated");
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [activeDeckId, setActiveDeckId] = useState("");
  const [studioDeckId, setStudioDeckId] = useState("");
  const [studioViewMode, setStudioViewMode] = useState("library");
  const [studioContextMenu, setStudioContextMenu] = useState(null);
  const [appModal, setAppModal] = useState(null);
  const [desktopContextMenu, setDesktopContextMenu] = useState(null);
  const [desktopMapLibrary, setDesktopMapLibrary] = useState({ rootPath: "", domains: [] });
  const [desktopLibraryPending, setDesktopLibraryPending] = useState(false);
  const [desktopLibraryError, setDesktopLibraryError] = useState("");
  const [desktopDomainId, setDesktopDomainId] = useState("");
  const [desktopProjectId, setDesktopProjectId] = useState("");
  const [desktopSelectedSpotId, setDesktopSelectedSpotId] = useState("");
  const [desktopExplorerNode, setDesktopExplorerNode] = useState("root");
  const [desktopSearchQuery, setDesktopSearchQuery] = useState("");
  const [desktopSearchScope, setDesktopSearchScope] = useState("domain");
  const [desktopExpandedDomains, setDesktopExpandedDomains] = useState({});
  const [desktopExpandedProjects, setDesktopExpandedProjects] = useState({});
  const [studioSelection, setStudioSelection] = useState({ type: "deck", id: "" });
  const [mapPending, setMapPending] = useState(false);
  const [mapNotice, setMapNotice] = useState("");
  const [mapError, setMapError] = useState("");
  const [plannerPending, setPlannerPending] = useState(false);
  const [plannerError, setPlannerError] = useState("");
  const [teamNameInput, setTeamNameInput] = useState("");
  const [teamCodeInput, setTeamCodeInput] = useState("");
  const isDesktopApp = Boolean(desktopBridge?.isDesktop);

  const canSubmitLogin =
    Boolean(usernameInput.trim()) && Boolean(passwordInput) && !loginPending;

  useEffect(() => {
    if (!isDesktopApp) {
      return undefined;
    }

    document.body.classList.add("desktop-chrome");
    return () => {
      document.body.classList.remove("desktop-chrome");
    };
  }, [isDesktopApp]);

  if (isDesktopStudioWindow) {
    return (
      <DesktopStudioWindow
        projectId={desktopWindowProjectId}
        focusType={desktopWindowFocusType}
        focusId={desktopWindowFocusId}
        actorId={desktopWindowActorId}
      />
    );
  }

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!studioContextMenu) {
      return undefined;
    }

    function closeMenu() {
      setStudioContextMenu(null);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setStudioContextMenu(null);
      }
    }

    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [studioContextMenu]);

  useEffect(() => {
    if (!desktopContextMenu) {
      return undefined;
    }

    function closeMenu() {
      setDesktopContextMenu(null);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setDesktopContextMenu(null);
      }
    }

    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [desktopContextMenu]);

  function showLoginNotice(message, isError = false, resetDelay = 2600) {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }

    setLoginNotice(message);
    setIsLoginNoticeError(isError);

    if (isError) {
      noticeTimerRef.current = window.setTimeout(() => {
        setLoginNotice(DEFAULT_LOGIN_NOTICE);
        setIsLoginNoticeError(false);
      }, resetDelay);
    }
  }

  async function loadDesktopMapLibrary() {
    if (!desktopBridge?.isDesktop || !session) {
      return;
    }

    try {
      setDesktopLibraryPending(true);
      setDesktopLibraryError("");
      const response = await fetch(`/api/maps/library?viewerId=${encodeURIComponent(session.id)}`);

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "맵 라이브러리를 불러오지 못했습니다.");
      }

      const payload = await response.json();
      setDesktopMapLibrary(normalizeMapLibraryPayload(payload));
    } catch (desktopError) {
      setDesktopLibraryError(desktopError.message || "맵 라이브러리를 불러오지 못했습니다.");
    } finally {
      setDesktopLibraryPending(false);
    }
  }

  async function loadDashboardSnapshot(showSpinner = true) {
    if (!session) {
      return;
    }

    try {
      if (showSpinner) {
        setDashboardLoading(true);
      }

      const query = `viewerId=${encodeURIComponent(session.id)}`;
      const [robotsResponse, accountsResponse, teamsResponse, mapResponse] = await Promise.all([
        fetch("/api/robots"),
        fetch(`/api/accounts/status?${query}`),
        fetch(`/api/teams/graph?${query}`),
        fetch(`/api/maps/monitor?${query}`)
      ]);

      if (!robotsResponse.ok || !accountsResponse.ok || !teamsResponse.ok || !mapResponse.ok) {
        throw new Error("대시보드 데이터를 불러오지 못했습니다.");
      }

      const [robotsPayload, accountsPayload, teamsPayload, mapPayload] = await Promise.all([
        robotsResponse.json(),
        accountsResponse.json(),
        teamsResponse.json(),
        mapResponse.json()
      ]);

      setFleetData(robotsPayload);
      setVisibleAccounts(accountsPayload.accounts ?? []);
      setTeamGraph({
        teams: teamsPayload.teams ?? [],
        accounts: teamsPayload.accounts ?? []
      });
      setMonitorMap({
        map: mapPayload.map ?? null,
        accessibleSpotIds: mapPayload.accessibleSpotIds ?? []
      });
      setActiveDeckId((currentDeckId) => {
        const nextMap = mapPayload.map;
        const availableDecks = nextMap?.decks ?? [];

        if (!availableDecks.length) {
          return "";
        }

        if (availableDecks.some((deck) => deck.id === currentDeckId)) {
          return currentDeckId;
        }

        return nextMap.activeDeckId ?? availableDecks[0].id;
      });
      setDashboardError("");
      setLastSync(new Date().toISOString());
    } catch (fetchError) {
      setDashboardError(fetchError.message);
    } finally {
      if (showSpinner) {
        setDashboardLoading(false);
      }
    }
  }

  async function loadStudioBundle() {
    if (!session) {
      return;
    }

    try {
      setMapError("");
      const query = `viewerId=${encodeURIComponent(session.id)}`;
      const response = await fetch(`/api/maps/studio?${query}`);

      if (!response.ok) {
        throw new Error("맵 스튜디오 데이터를 불러오지 못했습니다.");
      }

      const payload = await response.json();
      setStudioBundle({
        canEdit: payload.canEdit ?? false,
        published: payload.published ?? null,
        draft: payload.draft ?? null
      });
      setStudioDeckId((currentDeckId) => {
        const draftDecks = payload.draft?.decks ?? [];

        if (!draftDecks.length) {
          return "";
        }

        if (draftDecks.some((deck) => deck.id === currentDeckId)) {
          return currentDeckId;
        }

        return payload.draft?.activeDeckId ?? draftDecks[0].id;
      });
      setStudioSelection((current) => {
        if (current.id) {
          return current;
        }

        return {
          type: "deck",
          id: payload.draft?.activeDeckId ?? payload.draft?.decks?.[0]?.id ?? ""
        };
      });
    } catch (studioLoadError) {
      setMapError(studioLoadError.message);
    }
  }

  useEffect(() => {
    if (!session) {
      return;
    }

    let isMounted = true;

    async function loadDashboard(showSpinner) {
      if (!isMounted) {
        return;
      }

      await loadDashboardSnapshot(showSpinner);
    }

    loadDashboard(true);
    const intervalId = window.setInterval(() => loadDashboard(false), 12000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [session]);

  useEffect(() => {
    if (!session || activeTopTab !== "map") {
      return;
    }

    loadStudioBundle();
  }, [session, activeTopTab]);

  useEffect(() => {
    if (!desktopBridge?.isDesktop || !session || activeTopTab !== "map" || activeSubTab !== "map-studio") {
      return;
    }

    loadDesktopMapLibrary();
  }, [desktopBridge, session, activeTopTab, activeSubTab]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const nextVisibleRobots = filterRobotsBySession(fleetData.robots, session);

    if (!nextVisibleRobots.some((robot) => robot.id === selectedRobotId)) {
      setSelectedRobotId(nextVisibleRobots[0]?.id ?? "");
    }
  }, [session, fleetData.robots, selectedRobotId]);

  const visibleRobots = session ? filterRobotsBySession(fleetData.robots, session) : [];
  const activeTopConfig =
    topNavConfig.find((tab) => tab.key === activeTopTab) ?? topNavConfig[0];
  const activeSubConfig =
    activeTopConfig.subItems.find((item) => item.id === activeSubTab) ??
    activeTopConfig.subItems[0];
  const publishedMap = monitorMap.map;
  const activeDeck = getDeckById(publishedMap, activeDeckId);
  const studioDraft = studioBundle.draft;
  const studioDeck = getDeckById(studioDraft, studioDeckId);
  const visibleSummary = summarizeRobots(visibleRobots);
  const selectedRobot =
    visibleRobots.find((robot) => robot.id === selectedRobotId) ?? visibleRobots[0] ?? null;
  const activeDeckRobots = activeDeck
    ? visibleRobots.filter((robot) => robot.mapPose?.deckId === activeDeck.id)
    : visibleRobots;
  const onlineAccounts = visibleAccounts.filter((account) => account.status === "online").length;
  const myAccountStatus =
    visibleAccounts.find((account) => account.id === session?.id) ??
    (session
      ? {
          id: session.id,
          name: session.name,
          status: session.status,
          heartbeat: session.heartbeat
        }
      : null);

  useEffect(() => {
    if (!selectedRobot?.mapPose?.deckId) {
      return;
    }

    setActiveDeckId((currentDeckId) => currentDeckId || selectedRobot.mapPose.deckId);
  }, [selectedRobot]);

  useEffect(() => {
    if (!studioDeckId) {
      return;
    }

    setStudioSelection((current) => {
      if (current.type === "deck" && current.id === studioDeckId) {
        return current;
      }

      if (!current.id) {
        return { type: "deck", id: studioDeckId };
      }

      return current;
    });
  }, [studioDeckId]);

  useEffect(() => {
    if (!studioDraft || !studioDeckId || !studioSelection.id) {
      return;
    }

    const currentDeck = getDeckById(studioDraft, studioDeckId);

    if (!currentDeck) {
      return;
    }

    if (studioSelection.type === "deck") {
      return;
    }

    const exists =
      (studioSelection.type === "spot" &&
        currentDeck.spots?.some((spot) => spot.id === studioSelection.id)) ||
      (studioSelection.type === "nogo" &&
        currentDeck.noGoZones?.some((zone) => zone.id === studioSelection.id)) ||
      (studioSelection.type === "dock" &&
        [...(currentDeck.docks ?? []), ...(currentDeck.portals ?? [])].some(
          (dock) => dock.id === studioSelection.id
        ));

    if (!exists) {
      setStudioSelection({ type: "deck", id: studioDeckId });
    }
  }, [studioDraft, studioDeckId, studioSelection]);

  useEffect(() => {
    if (!studioDraft || !studioDeckId) {
      return;
    }

    const currentDeck = getDeckById(studioDraft, studioDeckId);

    if ((currentDeck?.spots?.length ?? 0) === 1) {
      setStudioSelection((current) =>
        current.type === "spot" && current.id === currentDeck.spots[0].id
          ? current
          : { type: "spot", id: currentDeck.spots[0].id }
      );
    }
  }, [studioDraft, studioDeckId]);

  useEffect(() => {
    const firstSubItem = activeTopConfig?.subItems?.[0];

    if (!activeTopConfig.subItems.some((item) => item.id === activeSubTab) && firstSubItem) {
      setActiveSubTab(firstSubItem.id);
    }
  }, [activeTopTab, activeSubTab, activeTopConfig]);

  useEffect(() => {
    if (!desktopMapLibrary.domains.length) {
      return;
    }

    if (!desktopMapLibrary.domains.some((domain) => domain.id === desktopDomainId)) {
      setDesktopDomainId(desktopMapLibrary.domains[0].id);
    }
  }, [desktopMapLibrary, desktopDomainId]);

  useEffect(() => {
    const activeDomain =
      desktopMapLibrary.domains.find((domain) => domain.id === desktopDomainId) ??
      desktopMapLibrary.domains[0] ??
      null;

    if (!activeDomain?.projects?.length) {
      if (desktopProjectId) {
        setDesktopProjectId("");
      }
      return;
    }

    if (!activeDomain.projects.some((project) => project.id === desktopProjectId)) {
      setDesktopProjectId(activeDomain.projects[0].id);
    }
  }, [desktopMapLibrary, desktopDomainId, desktopProjectId]);

  useEffect(() => {
    if (!desktopDomainId) {
      return;
    }

    setDesktopExpandedDomains((current) => ({
      ...current,
      [desktopDomainId]: true
    }));
  }, [desktopDomainId]);

  useEffect(() => {
    if (!desktopProjectId) {
      return;
    }

    setDesktopExpandedProjects((current) => ({
      ...current,
      [desktopProjectId]: true
    }));
  }, [desktopProjectId]);

  useEffect(() => {
    const allProjects = desktopMapLibrary.domains.flatMap((domain) => domain.projects ?? []);
    const activeProject =
      allProjects.find((project) => project.id === desktopProjectId) ??
      allProjects.find((project) => desktopExplorerNode === `project:${project.id}`) ??
      null;

    if (!activeProject?.spots?.some((spot) => spot.id === desktopSelectedSpotId)) {
      setDesktopSelectedSpotId(activeProject?.spots?.length === 1 ? activeProject.spots[0].id : "");
    }
  }, [desktopMapLibrary, desktopExplorerNode, desktopProjectId, desktopSelectedSpotId]);

  useEffect(() => {
    if (desktopExplorerNode === "root") {
      return;
    }

    if (desktopExplorerNode.startsWith("domain:")) {
      const targetDomainId = desktopExplorerNode.slice("domain:".length);

      if (!desktopMapLibrary.domains.some((domain) => domain.id === targetDomainId)) {
        setDesktopExplorerNode("root");
      }
      return;
    }

    if (desktopExplorerNode.startsWith("project:")) {
      const targetProjectId = desktopExplorerNode.slice("project:".length);
      const exists = desktopMapLibrary.domains.some((domain) =>
        (domain.projects ?? []).some((project) => project.id === targetProjectId)
      );

      if (!exists) {
        setDesktopExplorerNode("root");
      }
    }
  }, [desktopMapLibrary, desktopExplorerNode]);

  async function handleLogin(event) {
    event.preventDefault();

    const username = usernameInput.trim();

    if (!username || !passwordInput) {
      showLoginNotice("아이디와 비밀번호를 입력하세요.", true, 2200);
      return;
    }

    try {
      setLoginPending(true);
      showLoginNotice(DEFAULT_LOGIN_NOTICE, false, 0);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password: passwordInput
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "아이디 또는 비밀번호가 올바르지 않습니다.");
      }

      const payload = await response.json();
      setSession(payload.session);
      setFleetData(initialFleet);
      setVisibleAccounts([]);
      setTeamGraph(initialTeamGraph);
      setMonitorMap(initialMonitorMap);
      setStudioBundle(initialStudioBundle);
      setSelectedRobotId("");
      setDashboardError("");
      setLastSync(payload.loggedInAt ?? "");
      setActiveDeckId("");
      setStudioDeckId("");
      setStudioViewMode("library");
      setStudioContextMenu(null);
      setAppModal(null);
      setDesktopContextMenu(null);
      setDesktopMapLibrary({ rootPath: "", domains: [] });
      setDesktopLibraryError("");
      setDesktopDomainId("");
      setDesktopProjectId("");
      setDesktopSelectedSpotId("");
      setDesktopExplorerNode("root");
      setDesktopSearchQuery("");
      setDesktopExpandedDomains({});
      setDesktopExpandedProjects({});
      setStudioSelection({ type: "deck", id: "" });
      setMapNotice("");
      setMapError("");
      setPlannerError("");
      setPasswordInput("");
      showLoginNotice(DEFAULT_LOGIN_NOTICE, false, 0);
    } catch (loginError) {
      showLoginNotice(loginError.message, true, 2800);
    } finally {
      setLoginPending(false);
    }
  }

  function handleLogout() {
    setSession(null);
    setFleetData(initialFleet);
    setVisibleAccounts([]);
    setTeamGraph(initialTeamGraph);
    setMonitorMap(initialMonitorMap);
    setStudioBundle(initialStudioBundle);
    setSelectedRobotId("");
    setDashboardError("");
    setLastSync("");
    setActiveDeckId("");
    setStudioDeckId("");
    setStudioViewMode("library");
    setStudioContextMenu(null);
    setAppModal(null);
    setDesktopContextMenu(null);
    setDesktopMapLibrary({ rootPath: "", domains: [] });
    setDesktopLibraryError("");
    setDesktopDomainId("");
    setDesktopProjectId("");
    setDesktopSelectedSpotId("");
    setDesktopExplorerNode("root");
    setDesktopSearchQuery("");
    setDesktopExpandedDomains({});
    setDesktopExpandedProjects({});
    setStudioSelection({ type: "deck", id: "" });
    setMapNotice("");
    setMapError("");
    setPlannerError("");
    setPasswordInput("");
    showLoginNotice(DEFAULT_LOGIN_NOTICE, false, 0);
  }

  function updateStudioDeck(patch) {
    setStudioBundle((currentBundle) => {
      if (!currentBundle.draft) {
        return currentBundle;
      }

      return {
        ...currentBundle,
        draft: {
          ...currentBundle.draft,
          decks: currentBundle.draft.decks.map((deck) =>
            deck.id === studioDeckId
              ? {
                  ...deck,
                  ...patch,
                  image: patch.image ? { ...deck.image, ...patch.image } : deck.image,
                  calibration: patch.calibration
                    ? {
                        ...deck.calibration,
                        ...patch.calibration,
                        origin: {
                          ...deck.calibration.origin,
                          ...(patch.calibration.origin ?? {})
                        }
                      }
                    : deck.calibration
                }
              : deck
          )
        }
      };
    });
  }

  function updateStudioDomain(patch) {
    setStudioBundle((currentBundle) => {
      if (!currentBundle.draft) {
        return currentBundle;
      }

      return {
        ...currentBundle,
        draft: {
          ...currentBundle.draft,
          ...patch
        }
      };
    });
  }

  function updateStudioSpot(spotId, patch) {
    setStudioBundle((currentBundle) => {
      if (!currentBundle.draft) {
        return currentBundle;
      }

      return {
        ...currentBundle,
        draft: {
          ...currentBundle.draft,
          decks: currentBundle.draft.decks.map((deck) =>
            deck.id === studioDeckId
              ? {
                  ...deck,
                  spots: (deck.spots ?? []).map((spot) =>
                    spot.id === spotId
                      ? {
                          ...spot,
                          ...patch,
                          calibration: patch.calibration
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
                  )
                }
              : deck
          )
        }
      };
    });
  }

  function updateStudioNoGo(zoneId, patch) {
    setStudioBundle((currentBundle) => {
      if (!currentBundle.draft) {
        return currentBundle;
      }

      return {
        ...currentBundle,
        draft: {
          ...currentBundle.draft,
          decks: currentBundle.draft.decks.map((deck) =>
            deck.id === studioDeckId
              ? {
                  ...deck,
                  noGoZones: (deck.noGoZones ?? []).map((zone) =>
                    zone.id === zoneId ? { ...zone, ...patch } : zone
                  )
                }
              : deck
          )
        }
      };
    });
  }

  function updateStudioDock(dockId, patch) {
    setStudioBundle((currentBundle) => {
      if (!currentBundle.draft) {
        return currentBundle;
      }

      return {
        ...currentBundle,
        draft: {
          ...currentBundle.draft,
          decks: currentBundle.draft.decks.map((deck) => {
            if (deck.id !== studioDeckId) {
              return deck;
            }

            return {
              ...deck,
              docks: (deck.docks ?? []).map((dock) => (dock.id === dockId ? { ...dock, ...patch } : dock)),
              portals: (deck.portals ?? []).map((dock) =>
                dock.id === dockId ? { ...dock, ...patch } : dock
              )
            };
          })
        }
      };
    });
  }

  async function handleMapImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new window.Image();

      image.onload = () => {
        updateStudioDeck({
          image: {
            name: file.name,
            src: reader.result,
            width: image.naturalWidth,
            height: image.naturalHeight
          }
        });
        setMapNotice("커스텀 맵 이미지를 초안에 반영했습니다. 저장 후 배포할 수 있습니다.");
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleStudioOriginPick(point) {
    const currentDeck = getDeckById(studioDraft, studioDeckId);
    const spotTarget =
      currentDeck?.spots?.find(
        (spot) => studioSelection.type === "spot" && studioSelection.id === spot.id
      ) ?? (currentDeck?.spots?.length === 1 ? currentDeck.spots[0] : null);

    if (!spotTarget) {
      setMapError("로봇 원점은 Spot을 선택한 상태에서만 지정할 수 있습니다.");
      return;
    }

    updateStudioSpot(spotTarget.id, {
      calibration: {
        origin: {
          x: Math.round(point.x),
          y: Math.round(point.y)
        }
      }
    });
    setMapError("");
    setMapNotice(`${spotTarget.name} Spot 원점을 갱신했습니다.`);
  }

  function focusStudioItem(target) {
    if (!target?.id) {
      return;
    }

    if (target.type === "deck") {
      setStudioDeckId(target.id);
      setStudioSelection({ type: "deck", id: target.id });
      setStudioViewMode("editor");
      return;
    }

    if (target.deckId) {
      setStudioDeckId(target.deckId);
    }

    setStudioSelection({ type: target.type, id: target.id });
    setStudioViewMode("editor");
  }

  function openStudioItemContextMenu(event, target) {
    event.preventDefault();
    event.stopPropagation();
    setStudioContextMenu({
      x: event.clientX,
      y: event.clientY,
      target
    });
  }

  function renderStudioItemActions(target, options = {}) {
    const { allowDelete = true } = options;

    return (
      <span className="studio-item-actions" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="studio-item-action-button"
          onClick={() => focusStudioItem(target)}
          title="편집"
          aria-label="편집"
        >
          <BsPencilSquare aria-hidden="true" />
        </button>
        {allowDelete ? (
          <button
            type="button"
            className="studio-item-action-button is-danger"
            onClick={() => handleDeleteStudioSelection(target)}
            title="삭제"
            aria-label="삭제"
            disabled={mapPending}
          >
            <BsTrash3 aria-hidden="true" />
          </button>
        ) : null}
      </span>
    );
  }

  function renderStudioContextMenu() {
    if (!studioContextMenu?.target) {
      return null;
    }

    const { target } = studioContextMenu;
    const allowDelete = target.type !== "domain";
    const items = [
      {
        key: "edit",
        label: "편집",
        icon: <BsPencilSquare aria-hidden="true" />,
        onSelect: () => focusStudioItem(target)
      },
      allowDelete
        ? {
            key: "delete",
            label: "삭제",
            icon: <BsTrash3 aria-hidden="true" />,
            tone: "danger",
            onSelect: () => handleDeleteStudioSelection(target)
          }
        : null
    ];

    return (
      <ContextMenu
        x={studioContextMenu.x}
        y={studioContextMenu.y}
        items={items}
        onClose={() => setStudioContextMenu(null)}
      />
    );
  }

  function focusDesktopExplorerTarget(target) {
    if (!target) {
      return;
    }

    if (target.type === "domain") {
      setDesktopDomainId(target.id);
      setDesktopSelectedSpotId("");
      setDesktopExplorerNode(`domain:${target.id}`);
      return;
    }

    if (target.type === "project") {
      setDesktopProjectId(target.id);
      setDesktopSelectedSpotId("");
      setDesktopExplorerNode(`project:${target.id}`);
      return;
    }

    if (target.type === "spot") {
      if (target.domainId) {
        setDesktopDomainId(target.domainId);
      }
      if (target.projectId) {
        setDesktopProjectId(target.projectId);
        setDesktopExplorerNode(`project:${target.projectId}`);
      }
      setDesktopSelectedSpotId(target.id);
    }
  }

  function applyDesktopLibraryResult(result) {
    if (!result) {
      return;
    }

    const nextLibrary = result.library ?? result;
    setDesktopMapLibrary(nextLibrary);

    if (result.selectedDomainId) {
      setDesktopDomainId(result.selectedDomainId);
      setDesktopExplorerNode(`domain:${result.selectedDomainId}`);
    }

    if (result.selectedProjectId) {
      setDesktopProjectId(result.selectedProjectId);
      setDesktopExplorerNode(`project:${result.selectedProjectId}`);
    }

    if ("selectedSpotId" in result) {
      setDesktopSelectedSpotId(result.selectedSpotId ?? "");
    }
  }

  function closeAppModal() {
    setAppModal(null);
  }

  async function renameDesktopExplorerTarget(target) {
    if (!session || !target) {
      return;
    }

    const currentName = target.name ?? "";
    setDesktopContextMenu(null);
    setAppModal({
      kind: "input",
      caption: "Rename",
      title: `${target.type === "domain" ? "Domain" : target.type === "project" ? "Deck" : "Spot"} 이름 변경`,
      description: `${currentName}의 새 이름을 입력하세요.`,
      inputLabel: "이름",
      initialValue: currentName,
      confirmText: "저장",
      pendingText: "저장 중...",
      onConfirm: async (nextValue) => {
        const normalizedName = nextValue.trim();

        if (!normalizedName || normalizedName === currentName) {
          return;
        }

        setDesktopLibraryError("");

        if (target.type === "domain") {
          const response = await fetch("/api/maps/domain", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              actorId: session.id,
              name: normalizedName
            })
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.message || "Domain 이름 변경에 실패했습니다.");
          }
          await loadDesktopMapLibrary();
        } else if (target.type === "project") {
          const response = await fetch(`/api/maps/decks/${encodeURIComponent(target.id)}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              actorId: session.id,
              patch: { name: normalizedName }
            })
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.message || "Deck 이름 변경에 실패했습니다.");
          }
          await loadDesktopMapLibrary();
          setDesktopProjectId(target.id);
          setDesktopExplorerNode(`project:${target.id}`);
        } else if (target.type === "spot") {
          const response = await fetch(`/api/maps/spots/${encodeURIComponent(target.id)}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              actorId: session.id,
              deckId: target.projectId,
              patch: { name: normalizedName, zoneKey: normalizedName }
            })
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.message || "Spot 이름 변경에 실패했습니다.");
          }
          await loadDesktopMapLibrary();
          setDesktopProjectId(target.projectId);
          setDesktopExplorerNode(`project:${target.projectId}`);
          setDesktopSelectedSpotId(target.id);
        }
      }
    });
  }

  async function deleteDesktopExplorerTarget(target) {
    if (!session || !target) {
      return;
    }

    const label =
      target.type === "domain" ? "Domain" : target.type === "project" ? "Deck" : "Spot";
    setDesktopContextMenu(null);
    setAppModal({
      kind: "confirm",
      caption: "Delete",
      title: `${label} 삭제`,
      description: `${target.name} ${label}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: "삭제",
      cancelText: "취소",
      pendingText: "삭제 중...",
      tone: "danger",
      onConfirm: async () => {
        setDesktopLibraryError("");

        if (target.type === "project") {
          const response = await fetch(`/api/maps/decks/${encodeURIComponent(target.id)}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              actorId: session.id
            })
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.message || "Deck 삭제에 실패했습니다.");
          }
          await loadDesktopMapLibrary();
          setDesktopSelectedSpotId("");
        } else if (target.type === "spot") {
          const response = await fetch(`/api/maps/spots/${encodeURIComponent(target.id)}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              actorId: session.id,
              deckId: target.projectId
            })
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.message || "Spot 삭제에 실패했습니다.");
          }
          await loadDesktopMapLibrary();
          setDesktopSelectedSpotId("");
        }
      }
    });
  }

  function openDesktopContextMenu(event, target) {
    event.preventDefault();
    event.stopPropagation();
    setDesktopContextMenu({
      x: event.clientX,
      y: event.clientY,
      target
    });
  }

  function renderDesktopContextMenu() {
    if (!desktopContextMenu?.target) {
      return null;
    }

    const { target } = desktopContextMenu;
    const allowDelete = target.type === "project" || target.type === "spot";
    const canOpenStudio =
      desktopBridge?.isDesktop &&
      (
        target.type === "project" ||
        target.type === "spot" ||
        target.type === "project-folder" ||
        target.type === "project-asset"
      );
    const items = [
      canOpenStudio
        ? {
            key: "open-studio",
            label: "스튜디오 열기",
            icon: <BsBoxArrowUpRight aria-hidden="true" />,
            onSelect: () => {
              if (target.type === "spot" && target.projectId) {
                desktopBridge.openStudioWindow({
                  projectId: target.projectId,
                  focusType: "spot",
                  focusId: target.id,
                  actorId: session?.id ?? ""
                });
              } else if (target.projectId) {
                desktopBridge.openStudioWindow({
                  projectId: target.projectId,
                  focusType: "deck",
                  actorId: session?.id ?? ""
                });
              } else if (target.id) {
                desktopBridge.openStudioWindow({
                  projectId: target.id,
                  focusType: "deck",
                  actorId: session?.id ?? ""
                });
              }
            }
          }
        : null,
      target.type === "domain" || target.type === "project" || target.type === "spot"
        ? {
            key: "rename",
            label: "이름 변경",
            icon: <BsPencilSquare aria-hidden="true" />,
            onSelect: () => renameDesktopExplorerTarget(target)
          }
        : null,
      allowDelete
        ? {
            key: "delete",
            label: "삭제",
            icon: <BsTrash3 aria-hidden="true" />,
            tone: "danger",
            onSelect: () => deleteDesktopExplorerTarget(target)
          }
        : null
    ];

    return (
      <ContextMenu
        x={desktopContextMenu.x}
        y={desktopContextMenu.y}
        items={items}
        onClose={() => setDesktopContextMenu(null)}
      />
    );
  }

  async function handleSaveDomainName() {
    if (!session || session.role !== "root" || !studioDraft?.name) {
      return;
    }

    try {
      setMapPending(true);
      setMapError("");
      setMapNotice("");

      const response = await fetch("/api/maps/domain", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actorId: session.id,
          name: studioDraft.name
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Domain 저장에 실패했습니다.");
      }

      const payload = await response.json();
      setStudioBundle((current) => ({
        ...current,
        draft: payload.draft ?? current.draft
      }));
      setMapNotice(payload.message ?? "Domain 이름을 저장했습니다.");
    } catch (saveError) {
      setMapError(saveError.message);
    } finally {
      setMapPending(false);
    }
  }

  async function handleCreateDeck() {
    if (!session || session.role !== "root") {
      return;
    }

    try {
      setMapPending(true);
      setMapError("");
      setMapNotice("");

      const response = await fetch("/api/maps/decks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actorId: session.id
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Deck 추가에 실패했습니다.");
      }

      const payload = await response.json();
      setStudioBundle((current) => ({
        ...current,
        draft: payload.draft ?? current.draft
      }));
      if (payload.deck?.id) {
        setStudioDeckId(payload.deck.id);
        setStudioSelection({ type: "deck", id: payload.deck.id });
      }
      setMapNotice(payload.message ?? "Deck을 추가했습니다.");
    } catch (saveError) {
      setMapError(saveError.message);
    } finally {
      setMapPending(false);
    }
  }

  async function handleDeleteDeck() {
    if (!session || session.role !== "root" || !studioDeckId) {
      return;
    }

    try {
      setMapPending(true);
      setMapError("");
      setMapNotice("");

      const response = await fetch(`/api/maps/decks/${encodeURIComponent(studioDeckId)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actorId: session.id
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Deck 삭제에 실패했습니다.");
      }

      const payload = await response.json();
      setStudioBundle((current) => ({
        ...current,
        draft: payload.draft ?? current.draft
      }));
      const nextDeckId = payload.draft?.activeDeckId ?? payload.draft?.decks?.[0]?.id ?? "";
      setStudioDeckId(nextDeckId);
      setStudioSelection({ type: "deck", id: nextDeckId });
      setMapNotice(payload.message ?? "Deck을 삭제했습니다.");
    } catch (saveError) {
      setMapError(saveError.message);
    } finally {
      setMapPending(false);
    }
  }

  async function handleCreateStudioItem(kind) {
    if (!session || session.role !== "root" || !studioDeckId) {
      return;
    }

    const requestMap = {
      spot: { path: "/api/maps/spots", message: "Spot을 추가했습니다." },
      nogo: { path: "/api/maps/nogo-zones", message: "금지 구역을 추가했습니다." },
      dock: { path: "/api/maps/docks", message: "Dock을 추가했습니다.", body: { dock: { kind: "dock" } } },
      portal: {
        path: "/api/maps/docks",
        message: "Portal을 추가했습니다.",
        body: { dock: { kind: "vertical" } }
      }
    };

    const request = requestMap[kind];

    if (!request) {
      return;
    }

    try {
      setMapPending(true);
      setMapError("");
      setMapNotice("");

      const response = await fetch(request.path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actorId: session.id,
          deckId: studioDeckId,
          ...(request.body ?? {})
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || request.message);
      }

      const payload = await response.json();
      setStudioBundle((current) => ({
        ...current,
        draft: payload.draft ?? current.draft
      }));
      setMapNotice(payload.message ?? request.message);
    } catch (saveError) {
      setMapError(saveError.message);
    } finally {
      setMapPending(false);
    }
  }

  async function handleDeleteStudioSelection(targetSelection = studioSelection) {
    if (!session || session.role !== "root" || !targetSelection?.id) {
      return;
    }

    const targetDeckId =
      targetSelection.type === "deck" ? targetSelection.id : targetSelection.deckId ?? studioDeckId;
    const currentDeck = getDeckById(studioDraft, targetDeckId);
    const currentDock =
      [...(currentDeck?.docks ?? []), ...(currentDeck?.portals ?? [])].find(
        (dock) => dock.id === targetSelection.id
      ) ?? null;

    const deleteConfig =
      targetSelection.type === "spot"
        ? {
            path: `/api/maps/spots/${encodeURIComponent(targetSelection.id)}`,
            body: { actorId: session.id, deckId: targetDeckId }
          }
        : targetSelection.type === "nogo"
          ? {
              path: `/api/maps/nogo-zones/${encodeURIComponent(targetSelection.id)}`,
              body: { actorId: session.id, deckId: targetDeckId }
            }
          : targetSelection.type === "dock"
            ? {
                path: `/api/maps/docks/${encodeURIComponent(targetSelection.id)}`,
                body: {
                  actorId: session.id,
                  deckId: targetDeckId,
                  kind: currentDock?.kind === "vertical" ? "vertical" : "dock"
                }
              }
            : targetSelection.type === "deck"
              ? {
                  path: `/api/maps/decks/${encodeURIComponent(targetSelection.id)}`,
                  body: { actorId: session.id }
                }
              : null;

    if (!deleteConfig) {
      return;
    }

    try {
      setMapPending(true);
      setMapError("");
      setMapNotice("");

      const response = await fetch(deleteConfig.path, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(deleteConfig.body)
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "선택 항목 삭제에 실패했습니다.");
      }

      const payload = await response.json();
      setStudioBundle((current) => ({
        ...current,
        draft: payload.draft ?? current.draft
      }));
      const nextDeckId =
        payload.draft?.activeDeckId ??
        targetDeckId ??
        payload.draft?.decks?.[0]?.id ??
        "";
      setStudioDeckId(nextDeckId);
      setStudioSelection({ type: "deck", id: nextDeckId });
      setMapNotice(payload.message ?? "선택 항목을 삭제했습니다.");
    } catch (saveError) {
      setMapError(saveError.message);
    } finally {
      setMapPending(false);
    }
  }

  async function handleSaveMapDraft() {
    if (!session || !studioDeckId || !studioDraft || session.role !== "root") {
      return;
    }

    const targetDeck = getDeckById(studioDraft, studioDeckId);

    if (!targetDeck) {
      return;
    }

    try {
      setMapPending(true);
      setMapError("");
      setMapNotice("");

      const response = await fetch("/api/maps/studio", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actorId: session.id,
          deckId: studioDeckId,
          patch: {
            label: targetDeck.label,
            name: targetDeck.name,
            image: targetDeck.image,
            calibration: targetDeck.calibration,
            spots: targetDeck.spots,
            noGoZones: targetDeck.noGoZones,
            docks: targetDeck.docks,
            portals: targetDeck.portals
          }
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "맵 초안 저장에 실패했습니다.");
      }

      const payload = await response.json();
      setStudioBundle((current) => ({
        ...current,
        draft: payload.draft ?? current.draft
      }));
      setMapNotice(payload.message ?? "맵 초안을 저장했습니다.");
    } catch (saveError) {
      setMapError(saveError.message);
    } finally {
      setMapPending(false);
    }
  }

  async function handlePublishMap() {
    if (!session || session.role !== "root") {
      return;
    }

    try {
      setMapPending(true);
      setMapError("");
      setMapNotice("");

      const response = await fetch("/api/maps/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actorId: session.id
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "맵 배포에 실패했습니다.");
      }

      const payload = await response.json();
      setMapNotice(payload.message ?? "맵을 관제 버전으로 배포했습니다.");
      await Promise.all([loadDashboardSnapshot(false), loadStudioBundle()]);
    } catch (publishError) {
      setMapError(publishError.message);
    } finally {
      setMapPending(false);
    }
  }

  async function handleCreateTeam(event) {
    event.preventDefault();

    if (!session || session.role !== "root") {
      return;
    }

    const teamName = teamNameInput.trim();
    const teamCode = teamCodeInput.trim().toUpperCase();

    if (!teamName || !teamCode) {
      setPlannerError("팀 이름과 코드를 입력하세요.");
      return;
    }

    try {
      setPlannerPending(true);
      setPlannerError("");

      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actorId: session.id,
          name: teamName,
          code: teamCode
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "팀 생성에 실패했습니다.");
      }

      setTeamNameInput("");
      setTeamCodeInput("");
      await loadDashboardSnapshot(false);
    } catch (createError) {
      setPlannerError(createError.message);
    } finally {
      setPlannerPending(false);
    }
  }

  async function handleAssignTeam(accountId, teamId) {
    if (!session || session.role !== "root") {
      return;
    }

    try {
      setPlannerPending(true);
      setPlannerError("");

      const response = await fetch("/api/teams/assign", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actorId: session.id,
          accountId,
          teamId
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "팀 배정 업데이트에 실패했습니다.");
      }

      await loadDashboardSnapshot(false);
    } catch (assignError) {
      setPlannerError(assignError.message);
    } finally {
      setPlannerPending(false);
    }
  }

  async function handleMoveNode(nodeType, nodeId, x, y) {
    if (!session || session.role !== "root") {
      return;
    }

    const previousGraph = teamGraph;

    setTeamGraph((current) => ({
      teams:
        nodeType === "team"
          ? current.teams.map((team) => (team.id === nodeId ? { ...team, node: { x, y } } : team))
          : current.teams,
      accounts:
        nodeType === "account"
          ? current.accounts.map((account) =>
              account.id === nodeId ? { ...account, node: { x, y } } : account
            )
          : current.accounts
    }));

    try {
      const response = await fetch("/api/teams/node", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actorId: session.id,
          nodeType,
          nodeId,
          x,
          y
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "노드 위치 저장에 실패했습니다.");
      }
    } catch (moveError) {
      setTeamGraph(previousGraph);
      setPlannerError(moveError.message);
    }
  }

  const menuTitleMap = {
    integrated: "권한 기반 통합 관제",
    fleet: "플릿 운영 보기",
    mission: "미션 운용 보드",
    map: "맵 운영 센터",
    event: "사건 대응 대시보드",
    access: "권한·팀 관리",
    settings: "시스템 설정"
  };

  const menuCopyMap = {
    integrated:
      session?.role === "root"
        ? "관리자는 모든 계정을 관리/열람하고 팀을 구성할 수 있습니다."
        : "운영자는 할당된 팀 계정만 열람하고 지정된 장비 범위에서 운용합니다.",
    fleet: "로봇 상태와 장비 상태를 중심으로 운용 상황을 확인합니다.",
    mission: "미션 큐, 실행 현황, 예약 작업을 메뉴 단위로 분리해 관리합니다.",
    map: "구역·도킹·금지 구역을 지도 기준으로 추적하고 점검합니다.",
    event: "실시간 사건과 경보 이력을 시간축으로 정리해 대응합니다.",
    access:
      session?.role === "root"
        ? "계정, 팀, 노드 그래프를 기반으로 책임과 권한 범위를 설계합니다."
        : "본인에게 허용된 계정 범위와 팀 권한만 열람합니다.",
    settings: "시스템·네트워크·보안 정책을 운영 기준에 맞춰 구성합니다."
  };

  const missionItems = visibleRobots.map((robot) => ({
    id: robot.id,
    name: robot.name,
    mission: robot.mission,
    status: robotStatusLabel[robot.status] ?? robot.status,
    location: robot.location
  }));

  const mapLocations = Array.from(
    new Set(visibleRobots.map((robot) => robot.location).filter(Boolean))
  );

  const eventItems = [
    ...visibleRobots
      .filter((robot) => robot.status === "warning" || robot.status === "offline")
      .map((robot) => ({
        id: `robot-${robot.id}`,
        title: `${robot.name} 상태 경보`,
        detail: `${robot.location} · ${robotStatusLabel[robot.status] ?? robot.status}`,
        level: robot.status === "offline" ? "high" : "medium"
      })),
    ...visibleAccounts
      .filter((account) => account.status === "offline" || account.status === "idle")
      .map((account) => ({
        id: `account-${account.id}`,
        title: `${account.name} 계정 상태`,
        detail: `${account.teamName ?? "미배정"} · ${accountStatusLabel[account.status] ?? account.status}`,
        level: account.status === "offline" ? "high" : "low"
      }))
  ];

  const teamSummaries = teamGraph.teams.map((team) => {
    const members = teamGraph.accounts.filter((account) => account.teamId === team.id);
    const onlineMembers = members.filter((account) => account.status === "online").length;

    return {
      id: team.id,
      name: team.name,
      code: team.code,
      members: members.length,
      onlineMembers
    };
  });

  const auditEntries = [
    ...eventItems.slice(0, 8).map((item, index) => ({
      id: `event-${item.id}`,
      headline: item.title,
      detail: item.detail,
      stamp: `${index + 1}분 전`
    })),
    ...visibleAccounts.slice(0, 8).map((account, index) => ({
      id: `account-${account.id}`,
      headline: `${account.name} 접근 세션`,
      detail: `${account.teamName ?? "미배정"} · ${accountStatusLabel[account.status] ?? account.status}`,
      stamp: `${index + 2}분 전`
    }))
  ];

  const missionCatalog = missionItems.reduce((accumulator, item) => {
    const existing = accumulator.find((entry) => entry.mission === item.mission);

    if (existing) {
      existing.count += 1;
      existing.robots.push(item.name);
      return accumulator;
    }

    accumulator.push({
      mission: item.mission,
      count: 1,
      robots: [item.name]
    });

    return accumulator;
  }, []);

  function renderRobotList(robots, emptyText = "표시할 로봇이 없습니다.") {
    if (!robots.length) {
      return <div className="empty-state">{emptyText}</div>;
    }

    return (
      <div className="robot-list compact-list">
        {robots.map((robot) => (
          <button
            key={robot.id}
            type="button"
            className={`robot-card ${selectedRobotId === robot.id ? "is-selected" : ""}`}
            onClick={() => {
              setSelectedRobotId(robot.id);

              if (robot.mapPose?.deckId) {
                setActiveDeckId(robot.mapPose.deckId);
              }
            }}
          >
            <div className="robot-card-head">
              <div>
                <strong>{robot.name}</strong>
                <span>{robot.id}</span>
              </div>
              <span className={`status-pill ${robotStatusClassName[robot.status] ?? ""}`}>
                {robotStatusLabel[robot.status] ?? robot.status}
              </span>
            </div>
            <div className="robot-card-body">
              <span>{robot.location}</span>
              <span>Battery {robot.battery}%</span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  function renderAccountList(accounts, emptyText = "표시할 계정이 없습니다.") {
    if (!accounts.length) {
      return <div className="empty-state">{emptyText}</div>;
    }

    return (
      <div className="account-status-list compact-list">
        {accounts.map((account) => (
          <article key={account.id} className="account-status-card">
            <div className="account-badge">{account.badge}</div>
            <div className="account-copy">
              <strong>{account.name}</strong>
              <span>{account.email}</span>
              <small>{account.teamName ?? "미배정"}</small>
            </div>
            <div className="account-side">
              <span className={`account-pill ${accountStatusClassName[account.status] ?? ""}`}>
                {accountStatusLabel[account.status] ?? account.status}
              </span>
              <small>{account.heartbeat}</small>
            </div>
          </article>
        ))}
      </div>
    );
  }

  function renderIntegratedLayout() {
    if (!publishedMap || !activeDeck) {
      return <div className="loading-panel">관제 맵을 준비하는 중입니다.</div>;
    }

    const alertsCount = eventItems.length;
    const scopedSpot = activeDeck.spots?.length === 1 ? activeDeck.spots[0] : null;
    const monitorScopeLabel = scopedSpot
      ? `${publishedMap.name} / ${scopedSpot.name}`
      : `${publishedMap.name} / ${activeDeck.label} ${activeDeck.name}`;
    const sidebarTitleMap = {
      overview: "요약",
      live: "실시간 추적",
      alerts: "경보",
      sessions: "세션"
    };

    let sidebarBody = null;

    if (activeSubTab === "alerts") {
      sidebarBody = (
        <div className="monitor-sidebar-section">
          <div className="panel-heading">
            <h2>{sidebarTitleMap[activeSubTab]}</h2>
            <span className="meta-pill" lang="en">
              {alertsCount} ALERTS
            </span>
          </div>
          <div className="menu-list compact-list">
            {eventItems.length ? (
              eventItems.map((item) => (
                <article key={item.id} className={`menu-list-item level-${item.level}`}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </article>
              ))
            ) : (
              <div className="empty-state">현재 경보가 없습니다.</div>
            )}
          </div>
        </div>
      );
    } else if (activeSubTab === "sessions") {
      sidebarBody = (
        <>
          <div className="monitor-sidebar-section">
            <div className="panel-heading">
              <h2>{sidebarTitleMap[activeSubTab]}</h2>
            </div>
            {renderAccountList(visibleAccounts.slice(0, 6))}
          </div>
          <div className="monitor-sidebar-section">
            <div className="chip-list compact-chip-list">
              {session.permissions.map((permission) => (
                <span key={permission} className="info-chip">
                  {permission}
                </span>
              ))}
            </div>
          </div>
        </>
      );
    } else if (activeSubTab === "live") {
      sidebarBody = (
        <>
          <div className="monitor-sidebar-section">
            <div className="panel-heading">
              <h2>{sidebarTitleMap[activeSubTab]}</h2>
              <span className="meta-pill" lang="en">
                {activeDeckRobots.length} ON DECK
              </span>
            </div>
            {renderRobotList(activeDeckRobots.slice(0, 6))}
          </div>
          <div className="monitor-sidebar-section">
            <div className="panel-heading">
              <h2>{selectedRobot?.name ?? "선택된 로봇 없음"}</h2>
            </div>
            {selectedRobot ? (
              <div className="detail-grid">
                <DetailItem label="Mission" value={selectedRobot.mission} />
                <DetailItem label="Location" value={selectedRobot.location} />
                <DetailItem label="Speed" value={selectedRobot.speed} />
                <DetailItem label="Battery" value={`${selectedRobot.battery}%`} />
              </div>
            ) : (
              <div className="empty-state">표시할 로봇이 없습니다.</div>
            )}
          </div>
        </>
      );
    } else {
      sidebarBody = (
        <>
          <div className="monitor-sidebar-section">
            <div className="panel-heading">
              <h2>{sidebarTitleMap[activeSubTab]}</h2>
            </div>
            <div className="detail-grid">
              <DetailItem label="Scope" value={session.scopeLabel} />
              <DetailItem
                label={scopedSpot ? "Spot" : "Deck"}
                value={scopedSpot ? scopedSpot.name : `${activeDeck.label} ${activeDeck.name}`}
              />
              <DetailItem label="Sync" value={formatSyncTime(lastSync)} />
              <DetailItem label="Alerts" value={alertsCount} />
            </div>
          </div>
          <div className="monitor-sidebar-section">
            <div className="panel-heading">
              <h2>{selectedRobot?.name ?? "선택된 로봇 없음"}</h2>
            </div>
            {selectedRobot ? (
              <div className="detail-grid">
                <DetailItem label="Mission" value={selectedRobot.mission} />
                <DetailItem label="Location" value={selectedRobot.location} />
                <DetailItem label="Battery" value={`${selectedRobot.battery}%`} />
                <DetailItem label="Status" value={robotStatusLabel[selectedRobot.status]} />
              </div>
            ) : (
              <div className="empty-state">선택된 로봇이 없습니다.</div>
            )}
          </div>
        </>
      );
    }

    return (
      <section className="panel-frame integrated-monitor-shell">
        <div className="monitor-stage-shell">
          <div className="monitor-canvas-shell">
            <div className="monitor-floating monitor-breadcrumb">
              <p className="section-label" lang="en">
                Monitoring
              </p>
              <strong>{monitorScopeLabel}</strong>
              <span>현재 툴박스 {activeSubConfig?.label ?? "-"}</span>
              <div className="deck-switcher">
                {publishedMap.decks.map((deck) => (
                  <button
                    key={deck.id}
                    type="button"
                    className={`deck-chip ${deck.id === activeDeck.id ? "is-active" : ""}`}
                    onClick={() => setActiveDeckId(deck.id)}
                  >
                    {deck.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="monitor-floating monitor-stats">
              <SummaryCard label="전체 로봇" value={visibleSummary.total} />
              <SummaryCard label="현재 Deck" value={activeDeckRobots.length} />
              <SummaryCard label="경보" value={alertsCount} />
              <SummaryCard label="온라인" value={onlineAccounts} />
            </div>

            <MapCanvas
              deck={activeDeck}
              robots={activeDeckRobots}
              accessibleSpotIds={monitorMap.accessibleSpotIds}
              selectedRobotId={selectedRobotId}
              onSelectRobot={(robot) => {
                setSelectedRobotId(robot.id);

                if (robot.mapPose?.deckId) {
                  setActiveDeckId(robot.mapPose.deckId);
                }
              }}
              showSpots
              showNoGo
              showDocks
            />

            <div className="monitor-floating monitor-indicators">
              {activeDeckRobots.slice(0, 4).map((robot) => (
                <button
                  key={robot.id}
                  type="button"
                  className={`robot-mini-chip ${selectedRobotId === robot.id ? "is-active" : ""}`}
                  onClick={() => {
                    setSelectedRobotId(robot.id);

                    if (robot.mapPose?.deckId) {
                      setActiveDeckId(robot.mapPose.deckId);
                    }
                  }}
                >
                  <span>{robot.id}</span>
                  <strong>{robot.battery}%</strong>
                </button>
              ))}
            </div>
          </div>

          <aside className="monitor-context">{sidebarBody}</aside>
        </div>
      </section>
    );
  }

  function renderFleetLayout() {
    const fleetViewMap = {
      "fleet-all": {
        title: "전체 로봇",
        robots: visibleRobots
      },
      "fleet-status": {
        title: "상태 기반 로봇",
        robots: visibleRobots.filter(
          (robot) => robot.status === "active" || robot.status === "warning"
        )
      },
      "fleet-charge": {
        title: "충전 대상",
        robots: visibleRobots.filter((robot) => robot.status === "charging")
      },
      "fleet-maint": {
        title: "정비 우선",
        robots: visibleRobots.filter(
          (robot) => robot.status === "warning" || robot.status === "offline"
        )
      }
    };

    const fleetView = fleetViewMap[activeSubTab] ?? fleetViewMap["fleet-all"];

    return (
      <>
        <section className="summary-grid">
          <SummaryCard label="전체" value={visibleSummary.total} />
          <SummaryCard label="정상" value={visibleSummary.active} />
          <SummaryCard label="충전" value={visibleSummary.charging} />
          <SummaryCard label="점검/오프" value={visibleSummary.warning + visibleSummary.offline} />
        </section>
        <section className="panel-frame menu-layout menu-fleet-layout">
          <div className="menu-column">
            <div className="panel-heading">
              <h2>{fleetView.title}</h2>
              <span className="meta-pill" lang="en">
                {fleetView.robots.length} UNITS
              </span>
            </div>
            {renderRobotList(fleetView.robots.slice(0, 8), "표시할 로봇이 없습니다.")}
          </div>
          <div className="menu-column">
            <div className="panel-heading">
              <h2>{selectedRobot?.name ?? "선택된 로봇 없음"}</h2>
            </div>
            {selectedRobot ? (
              <div className="detail-grid">
                <DetailItem label="Mission" value={selectedRobot.mission} />
                <DetailItem label="Location" value={selectedRobot.location} />
                <DetailItem label="Battery" value={`${selectedRobot.battery}%`} />
                <DetailItem label="Speed" value={selectedRobot.speed} />
                <DetailItem label="Status" value={robotStatusLabel[selectedRobot.status]} />
                <DetailItem label="Toolbox" value={activeSubConfig?.label ?? "-"} />
              </div>
            ) : (
              <div className="empty-state">선택된 로봇이 없습니다.</div>
            )}
          </div>
        </section>
      </>
    );
  }

  function renderMissionLayout() {
    const scheduledMissions = [];

    const queueItems = missionItems.slice(0, 8);
    const runningItems = missionItems
      .filter((item) => item.status === robotStatusLabel.active || item.status === robotStatusLabel.charging)
      .slice(0, 8);

    const leftColumnTitle =
      activeSubTab === "mission-template"
        ? "미션 템플릿"
        : activeSubTab === "mission-schedule"
          ? "예약 미션"
          : "미션 큐";
    const rightColumnTitle =
      activeSubTab === "mission-template"
        ? "템플릿 적용 범위"
        : activeSubTab === "mission-schedule"
          ? "예약 상태"
          : "실행 상태";

    return (
      <section className="panel-frame menu-layout menu-mission-layout">
        <div className="menu-column">
          <div className="panel-heading">
            <h2>{leftColumnTitle}</h2>
          </div>
          <div className="menu-list">
            {activeSubTab === "mission-template"
              ? missionCatalog.length
                ? missionCatalog.map((item) => (
                    <article key={item.mission} className="menu-list-item">
                      <strong>{item.mission}</strong>
                      <span>연결 로봇 {item.count}대</span>
                      <small>{item.robots.join(", ")}</small>
                    </article>
                  ))
                : [
                    <div key="empty-template" className="empty-state">
                      등록된 미션 구성이 없습니다.
                    </div>
                  ]
              : activeSubTab === "mission-schedule"
                ? scheduledMissions.length
                  ? scheduledMissions.map((item) => (
                    <article key={item.id} className="menu-list-item">
                      <strong>{item.mission}</strong>
                      <span>{item.name}</span>
                      <small>{item.reserve}</small>
                    </article>
                    ))
                  : [
                      <div key="empty-schedule" className="empty-state">
                        예약 미션 데이터가 없습니다.
                      </div>
                    ]
                : queueItems.map((item) => (
                    <article key={item.id} className="menu-list-item">
                      <strong>{item.mission}</strong>
                      <span>{item.name}</span>
                      <small>{item.location}</small>
                    </article>
                  ))}
          </div>
        </div>
        <div className="menu-column">
          <div className="panel-heading">
            <h2>{rightColumnTitle}</h2>
          </div>
          <div className="menu-list">
            {activeSubTab === "mission-template"
              ? missionCatalog.length
                ? missionCatalog.map((item) => (
                    <article key={`${item.mission}-scope`} className="menu-list-item">
                      <strong>{item.mission}</strong>
                      <span>{session.scopeLabel}</span>
                      <small>현재 접근 범위 내 운용 중</small>
                    </article>
                  ))
                : [
                    <div key="empty-template-scope" className="empty-state">
                      표시할 적용 범위가 없습니다.
                    </div>
                  ]
              : activeSubTab === "mission-schedule"
                ? scheduledMissions.length
                  ? scheduledMissions.map((item) => (
                    <article key={`${item.id}-reserve`} className="menu-list-item">
                      <strong>{item.name}</strong>
                      <span>{item.status}</span>
                      <small>{item.reserve}</small>
                    </article>
                    ))
                  : [
                      <div key="empty-schedule-state" className="empty-state">
                        예약 상태 데이터가 없습니다.
                      </div>
                    ]
                : (activeSubTab === "mission-run" ? runningItems : missionItems.slice(0, 8)).map((item) => (
                    <article key={`${item.id}-status`} className="menu-list-item">
                      <strong>{item.name}</strong>
                      <span>{item.status}</span>
                      <small>{item.mission}</small>
                    </article>
                  ))}
          </div>
        </div>
      </section>
    );
  }

  function renderMapLayout() {
    if (activeSubTab === "map-studio" && desktopBridge?.isDesktop) {
      const desktopDomains = desktopMapLibrary.domains ?? [];
      const defaultDomain =
        desktopDomains.find((domain) => domain.id === desktopDomainId) ?? desktopDomains[0] ?? null;
      const allProjects = desktopDomains.flatMap((domain) => domain.projects ?? []);
      const explorerType = desktopExplorerNode.startsWith("spot:")
        ? "spot"
        : desktopExplorerNode.startsWith("project:")
        ? "project"
        : desktopExplorerNode.startsWith("domain:")
          ? "domain"
          : "root";
      const explorerDomainId =
        explorerType === "domain" ? desktopExplorerNode.slice("domain:".length) : "";
      const explorerProjectId =
        explorerType === "project"
          ? desktopExplorerNode.slice("project:".length)
          : explorerType === "spot"
            ? desktopExplorerNode.split(":")[1] ?? ""
            : "";
      const explorerSpotId = explorerType === "spot" ? desktopExplorerNode.split(":")[2] ?? "" : "";
      const explorerDomain =
        explorerType === "domain"
          ? desktopDomains.find((domain) => domain.id === explorerDomainId) ?? defaultDomain
          : explorerType === "project" || explorerType === "spot"
            ? desktopDomains.find((domain) =>
                (domain.projects ?? []).some((project) => project.id === explorerProjectId)
              ) ?? defaultDomain
            : defaultDomain;
      const explorerProjects = explorerDomain?.projects ?? [];
      const explorerProject =
        explorerType === "project" || explorerType === "spot"
          ? allProjects.find((project) => project.id === explorerProjectId) ?? null
          : null;
      const selectedDesktopProject =
        explorerProject ??
        explorerProjects.find((project) => project.id === desktopProjectId) ??
        explorerProjects[0] ??
        null;
      const selectedDesktopSpot =
        (explorerType === "spot"
          ? selectedDesktopProject?.spots?.find((spot) => spot.id === explorerSpotId) ?? null
          : null) ??
        selectedDesktopProject?.spots?.find((spot) => spot.id === desktopSelectedSpotId) ??
        (selectedDesktopProject?.spots?.length === 1 ? selectedDesktopProject.spots[0] : null);
      const allSpots = desktopDomains.flatMap((domain) =>
        (domain.projects ?? []).flatMap((project) =>
          (project.spots ?? []).map((spot) => ({
            ...spot,
            projectId: project.id,
            projectName: project.displayName ?? project.folderName,
            domainId: domain.id,
            domainName: domain.name
          }))
        )
      );
      const selectedDomainPortalLinks = explorerProjects.flatMap((project) => project.portalLinks ?? []);
      const normalizedQuery = desktopSearchQuery.trim().toLowerCase();
      const hasSearchQuery = normalizedQuery.length > 0;
      const matchesQuery = (value) => String(value ?? "").toLowerCase().includes(normalizedQuery);
      const searchScopeLabel =
        desktopSearchScope === "domain" ? "Domain" : desktopSearchScope === "deck" ? "Deck" : "Spot";
      const searchPlaceholder =
        desktopSearchScope === "domain"
          ? "Search domain"
          : desktopSearchScope === "deck"
            ? "Search deck"
            : "Search spot";
      const searchResultCount =
        desktopSearchScope === "domain"
          ? desktopDomains.filter((domain) => matchesQuery(domain.name)).length
          : desktopSearchScope === "deck"
            ? allProjects.filter((project) => matchesQuery(project.displayName ?? project.folderName)).length
            : allSpots.filter((spot) => matchesQuery(spot.name)).length;
      const folderTitle = hasSearchQuery
        ? `${searchScopeLabel} Search`
        : explorerType === "spot"
          ? selectedDesktopSpot?.name ?? "Spot"
          : explorerType === "project"
            ? selectedDesktopProject?.displayName ?? selectedDesktopProject?.folderName ?? "Deck"
            : explorerType === "domain"
              ? explorerDomain?.name ?? "Domain"
              : "Map Library";
      const domainStudioProject = explorerProjects[0] ?? selectedDesktopProject ?? null;

      function renderDomainCard(domain) {
        return (
          <div
            key={domain.id}
            className="folder-card-shell"
            onContextMenu={(event) =>
              openDesktopContextMenu(event, {
                type: "domain",
                id: domain.id,
                name: domain.name
              })
            }
          >
            <button
              type="button"
              className="folder-card folder-card-folder"
              onClick={() => {
                setDesktopDomainId(domain.id);
                setDesktopSelectedSpotId("");
                setDesktopExplorerNode(`domain:${domain.id}`);
              }}
            >
              <span className="folder-card-icon">
                <MacFolderIcon size="lg" />
              </span>
              <strong>{domain.name}</strong>
              <small>{domain.projects.length} decks</small>
            </button>
          </div>
        );
      }

      function renderProjectCard(project, domainId = explorerDomain?.id ?? "") {
        return (
          <div
            key={project.id}
            className="folder-card-shell"
            onContextMenu={(event) =>
              openDesktopContextMenu(event, {
                type: "project",
                id: project.id,
                name: project.displayName ?? project.folderName,
                domainId
              })
            }
          >
            <button
              type="button"
              className="folder-card folder-card-folder"
              onClick={() => {
                setDesktopDomainId(domainId);
                setDesktopProjectId(project.id);
                setDesktopSelectedSpotId(project.spots?.length === 1 ? project.spots[0].id : "");
                setDesktopExplorerNode(`project:${project.id}`);
              }}
            >
              <span className="folder-card-icon">
                <MacFolderIcon size="lg" />
              </span>
              <strong>{project.displayName ?? project.folderName}</strong>
              <small>{project.spots?.length ?? 0} spots</small>
            </button>
          </div>
        );
      }

      function renderSpotCard(spot, projectId = selectedDesktopProject?.id ?? "", domainId = explorerDomain?.id ?? "") {
        return (
          <div
            key={`${projectId}-${spot.id}`}
            className="folder-card-shell"
            onContextMenu={(event) =>
              openDesktopContextMenu(event, {
                type: "spot",
                id: spot.id,
                name: spot.name,
                projectId,
                domainId
              })
            }
          >
            <button
              type="button"
              className="folder-card folder-card-folder"
              onClick={() => {
                if (!projectId) {
                  return;
                }

                setDesktopDomainId(domainId);
                setDesktopProjectId(projectId);
                setDesktopSelectedSpotId(spot.id);
                setDesktopExplorerNode(`spot:${projectId}:${spot.id}`);
              }}
            >
              <span className="folder-card-icon">
                <HierarchyGlyph kind="spot" size="lg" />
              </span>
              <strong>{spot.name}</strong>
              <small>
                {spot.width} x {spot.height}
              </small>
            </button>
          </div>
        );
      }

      function renderFolderGridContent() {
        if (hasSearchQuery) {
          if (desktopSearchScope === "domain") {
            return desktopDomains.filter((domain) => matchesQuery(domain.name)).map(renderDomainCard);
          }

          if (desktopSearchScope === "deck") {
            return desktopDomains.flatMap((domain) =>
              (domain.projects ?? [])
                .filter((project) => matchesQuery(project.displayName ?? project.folderName))
                .map((project) => renderProjectCard(project, domain.id))
            );
          }

          return allSpots
            .filter((spot) => matchesQuery(spot.name))
            .map((spot) => renderSpotCard(spot, spot.projectId, spot.domainId));
        }

        if (explorerType === "root") {
          return desktopDomains.map(renderDomainCard);
        }

        if (explorerType === "domain") {
          return explorerProjects.map((project) => renderProjectCard(project, explorerDomain?.id ?? ""));
        }

        if (explorerType === "project") {
          return (selectedDesktopProject?.spots ?? []).map((spot) =>
            renderSpotCard(spot, selectedDesktopProject?.id ?? "", explorerDomain?.id ?? "")
          );
        }

        return selectedDesktopSpot ? (
          <div className="folder-card-shell">
            <div className="folder-card folder-card-file is-selected">
              <span className="folder-card-icon">
                <HierarchyGlyph kind="spot" size="lg" />
              </span>
              <strong>{selectedDesktopSpot.name}</strong>
              <small>
                Origin{" "}
                {selectedDesktopSpot.calibration?.origin
                  ? `${selectedDesktopSpot.calibration.origin.x}, ${selectedDesktopSpot.calibration.origin.y}`
                  : "-"}
              </small>
            </div>
          </div>
        ) : null;
      }

      if (desktopLibraryPending) {
        return <div className="loading-panel">로컬 맵 라이브러리를 불러오는 중입니다.</div>;
      }

      if (desktopLibraryError) {
        return <div className="loading-panel is-error">{desktopLibraryError}</div>;
      }

      return (
        <section className="panel-frame folder-explorer-shell">
          <div className="folder-explorer-toolbar">
            <div className="folder-explorer-searchbar">
              <div className="folder-explorer-searchfilters" role="tablist" aria-label="검색 필터">
                {[
                  { id: "domain", label: "Domain" },
                  { id: "deck", label: "Deck" },
                  { id: "spot", label: "Spot" }
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`folder-explorer-searchfilter ${desktopSearchScope === option.id ? "is-active" : ""}`}
                    onClick={() => setDesktopSearchScope(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <label className="folder-explorer-searchinput">
                <BsSearch aria-hidden="true" />
                <input
                  type="text"
                  value={desktopSearchQuery}
                  onChange={(event) => setDesktopSearchQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                />
              </label>
            </div>

            {explorerType === "domain" ? (
              <button
                type="button"
                className="ghost-button explorer-toolbar-button"
                onClick={async () => {
                  if (!session || session.role !== "root" || !explorerDomain) {
                    return;
                  }

                  try {
                    const response = await fetch("/api/maps/decks", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        actorId: session.id
                      })
                    });

                    if (!response.ok) {
                      const payload = await response.json().catch(() => null);
                      throw new Error(payload?.message || "새 Deck 생성에 실패했습니다.");
                    }

                    const payload = await response.json();
                    await loadDesktopMapLibrary();
                    const nextDeckId = payload.deck?.id ?? "";
                    if (nextDeckId) {
                      setDesktopProjectId(nextDeckId);
                      setDesktopExplorerNode(`project:${nextDeckId}`);
                    }
                  } catch (desktopError) {
                    setDesktopLibraryError(desktopError.message || "새 Deck 생성에 실패했습니다.");
                  }
                }}
                disabled={session.role !== "root" || !explorerDomain}
              >
                <BsFolderPlus aria-hidden="true" />
                <span>새 Deck</span>
              </button>
            ) : null}

            {explorerType === "project" ? (
              <button
                type="button"
                className="ghost-button explorer-toolbar-button"
                onClick={async () => {
                  if (!session || session.role !== "root" || !selectedDesktopProject) {
                    return;
                  }

                  try {
                    const response = await fetch("/api/maps/spots", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        actorId: session.id,
                        deckId: selectedDesktopProject.id
                      })
                    });

                    if (!response.ok) {
                      const payload = await response.json().catch(() => null);
                      throw new Error(payload?.message || "새 Spot 생성에 실패했습니다.");
                    }

                    const payload = await response.json();
                    await loadDesktopMapLibrary();
                    const nextSpotId = payload.spot?.id ?? "";
                    if (nextSpotId) {
                      setDesktopSelectedSpotId(nextSpotId);
                      setDesktopExplorerNode(`spot:${nextSpotId}`);
                    }
                  } catch (desktopError) {
                    setDesktopLibraryError(desktopError.message || "새 Spot 생성에 실패했습니다.");
                  }
                }}
                disabled={session.role !== "root" || !selectedDesktopProject}
              >
                <BsGeoAltFill aria-hidden="true" />
                <span>새 Spot</span>
              </button>
            ) : null}
          </div>

          <div className="folder-explorer-body">
            <MapLibraryHierarchy
              domains={desktopDomains}
              selection={{
                explorerType,
                explorerDomainId: explorerDomain?.id ?? "",
                explorerProjectId: selectedDesktopProject?.id ?? "",
                explorerSpotId: selectedDesktopSpot?.id ?? "",
                activeDomainId: desktopDomainId
              }}
              query={desktopSearchQuery}
              searchScope={desktopSearchScope}
              expandedDomains={desktopExpandedDomains}
              expandedProjects={desktopExpandedProjects}
              onToggleDomain={(domainId, nextIsOpen) =>
                setDesktopExpandedDomains((current) => ({
                  ...current,
                  [domainId]: nextIsOpen
                }))
              }
              onToggleProject={(projectId, nextIsOpen) =>
                setDesktopExpandedProjects((current) => ({
                  ...current,
                  [projectId]: nextIsOpen
                }))
              }
              onSelectRoot={() => {
                setDesktopSelectedSpotId("");
                setDesktopExplorerNode("root");
              }}
              onSelectDomain={(domainId) => {
                setDesktopDomainId(domainId);
                setDesktopSelectedSpotId("");
                setDesktopExplorerNode(`domain:${domainId}`);
              }}
              onSelectProject={(domainId, project) => {
                setDesktopDomainId(domainId);
                setDesktopProjectId(project.id);
                setDesktopSelectedSpotId(project.spots?.length === 1 ? project.spots[0].id : "");
                setDesktopExplorerNode(`project:${project.id}`);
              }}
              onSelectSpot={(domainId, projectId, spotId) => {
                setDesktopDomainId(domainId);
                setDesktopProjectId(projectId);
                setDesktopSelectedSpotId(spotId);
                setDesktopExplorerNode(`spot:${projectId}:${spotId}`);
              }}
              onContextMenu={openDesktopContextMenu}
            />

            <div className="folder-content-panel">
              <div className="folder-content-header">
                <strong>{folderTitle}</strong>
                {hasSearchQuery ? (
                  <span className="folder-search-result-count">{searchResultCount} results</span>
                ) : null}
              </div>

              <div className="folder-grid">{renderFolderGridContent()}</div>
            </div>

            <aside className="folder-detail-panel">
              {explorerType === "root" ? (
                <>
                  <h3>Server Library</h3>
                  <div className="detail-grid">
                    <DetailItem label="Domains" value={desktopDomains.length} />
                    <DetailItem label="Projects" value={allProjects.length} />
                    <DetailItem
                      label="Spots"
                      value={allProjects.reduce((count, project) => count + (project.spots?.length ?? 0), 0)}
                    />
                    <DetailItem label="Mode" value="Server Sync" />
                  </div>
                </>
              ) : explorerType === "domain" ? (
                <>
                  <h3>{explorerDomain?.name ?? "Domain"}</h3>
                  <div className="detail-grid">
                    <DetailItem label="Folders" value={explorerProjects.length} />
                    <DetailItem label="Portals" value={selectedDomainPortalLinks.length} />
                    <DetailItem
                      label="Spots"
                      value={explorerProjects.reduce((count, project) => count + (project.spots?.length ?? 0), 0)}
                    />
                    <DetailItem label="Scope" value="Domain Workspace" />
                  </div>
                  <div className="studio-asset-group">
                    <span className="studio-library-label">Domain Summary</span>
                    <div className="studio-asset-list">
                      {explorerProjects.length ? (
                        explorerProjects.slice(0, 6).map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            className="studio-asset-item"
                            onClick={() => {
                              setDesktopProjectId(project.id);
                              setDesktopExplorerNode(`project:${project.id}`);
                            }}
                          >
                            <strong>{project.displayName ?? project.folderName}</strong>
                            <small>{project.spots?.length ?? 0} spots</small>
                          </button>
                        ))
                      ) : (
                        <div className="empty-state compact-empty">등록된 Deck이 없습니다.</div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      if (domainStudioProject) {
                        desktopBridge.openStudioWindow({
                          projectId: domainStudioProject.id,
                          focusType: "domain",
                          focusId: explorerDomain?.id ?? "",
                          actorId: session?.id ?? ""
                        });
                      }
                    }}
                    disabled={!domainStudioProject}
                  >
                    Domain 스튜디오
                  </button>
                </>
              ) : explorerType === "project" ? (
                <>
                  <h3>{selectedDesktopProject?.displayName ?? selectedDesktopProject?.folderName ?? "Deck"}</h3>
                  <div className="detail-grid">
                    <DetailItem label="Version" value={selectedDesktopProject?.version ?? "-"} />
                    <DetailItem label="Status" value={selectedDesktopProject?.status ?? "-"} />
                    <DetailItem label="Spots" value={selectedDesktopProject?.spots?.length ?? 0} />
                    <DetailItem label="Portals" value={selectedDesktopProject?.portalLinks?.length ?? 0} />
                  </div>

                  <div className="studio-asset-group">
                    <span className="studio-library-label">Portal Links</span>
                    <div className="studio-asset-list">
                      {selectedDesktopProject?.portalLinks?.length ? (
                        selectedDesktopProject.portalLinks.map((link) => (
                          <button
                            key={link.id}
                            type="button"
                            className="studio-asset-item"
                            onClick={() => {
                              if (link.targetProjectId) {
                                setDesktopProjectId(link.targetProjectId);
                                setDesktopExplorerNode(`project:${link.targetProjectId}`);
                              }
                            }}
                          >
                            <strong>{link.name}</strong>
                            <small>{link.targetLabel}</small>
                          </button>
                        ))
                      ) : (
                        <div className="empty-state compact-empty">연결된 포털이 없습니다.</div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      if (selectedDesktopProject) {
                        desktopBridge.openStudioWindow({
                          projectId: selectedDesktopProject.id,
                          focusType: "deck",
                          actorId: session?.id ?? ""
                        });
                      }
                    }}
                    disabled={!selectedDesktopProject}
                  >
                    Deck 스튜디오
                  </button>
                </>
              ) : (
                <>
                  <h3>{selectedDesktopSpot?.name ?? "Spot"}</h3>
                  <div className="detail-grid">
                    <DetailItem label="Deck" value={selectedDesktopProject?.displayName ?? "-"} />
                    <DetailItem label="Kind" value="Spot" />
                    <DetailItem
                      label="Frame"
                      value={
                        selectedDesktopSpot
                          ? `${selectedDesktopSpot.width} x ${selectedDesktopSpot.height}`
                          : "-"
                      }
                    />
                    <DetailItem
                      label="Origin"
                      value={
                        selectedDesktopSpot?.calibration?.origin
                          ? `${selectedDesktopSpot.calibration.origin.x}, ${selectedDesktopSpot.calibration.origin.y}`
                          : "-"
                      }
                    />
                  </div>

                  <div className="studio-asset-group">
                    <span className="studio-library-label">Spot Summary</span>
                    <div className="detail-grid">
                      <DetailItem label="Zone" value={selectedDesktopSpot?.zoneKey ?? "-"} />
                      <DetailItem
                        label="Resolution"
                        value={selectedDesktopSpot?.calibration?.resolution ?? "-"}
                      />
                      <DetailItem
                        label="Rotation"
                        value={selectedDesktopSpot?.calibration?.rotation ?? "-"}
                      />
                      <DetailItem
                        label="Grid"
                        value={selectedDesktopSpot?.calibration?.gridMeters ?? "-"}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      if (selectedDesktopProject && selectedDesktopSpot) {
                        desktopBridge.openStudioWindow({
                          projectId: selectedDesktopProject.id,
                          focusType: "spot",
                          focusId: selectedDesktopSpot.id,
                          actorId: session?.id ?? ""
                        });
                      }
                    }}
                    disabled={!selectedDesktopProject || !selectedDesktopSpot}
                  >
                    Spot 스튜디오
                  </button>
                </>
              )}
            </aside>
          </div>
          {renderDesktopContextMenu()}
        </section>
      );
    }

    const useDraftMap = activeSubTab === "map-studio" && studioBundle.canEdit;
    const mapDocument = useDraftMap ? studioDraft ?? publishedMap : publishedMap;
    const targetDeckId = useDraftMap ? studioDeckId : activeDeckId;
    const mapDeck = getDeckById(mapDocument, targetDeckId);

    if (!mapDocument || !mapDeck) {
      return <div className="loading-panel">맵 데이터를 준비하는 중입니다.</div>;
    }

    const deckRobots = visibleRobots.filter((robot) => robot.mapPose?.deckId === mapDeck.id);
    const zoneItems = mapDeck.spots ?? [];
    const noGoItems = mapDeck.noGoZones ?? [];
    const dockItems = [...(mapDeck.docks ?? []), ...(mapDeck.portals ?? [])];

    if (activeSubTab === "map-studio") {
      const canEdit = session.role === "root" && studioBundle.canEdit;
      const studioDecks = mapDocument.decks ?? [];
      const selectedDeckFileName = `${mapDeck.label.toLowerCase()}-${mapDeck.name
        .replace(/\s+/g, "-")
        .toLowerCase()}.map`;
      const selectedImageFileName = mapDeck.image?.name
        ? `${mapDeck.image.name}.png`
        : `${mapDeck.label.toLowerCase()}-generated.png`;
      const selectedDeckInfo =
        studioDecks.find((deck) => deck.id === studioSelection.id) ?? mapDeck;
      const selectedSpot =
        zoneItems.find((spot) => studioSelection.type === "spot" && spot.id === studioSelection.id) ??
        null;
      const effectiveSpot = selectedSpot ?? (zoneItems.length === 1 ? zoneItems[0] : null);
      const selectedNoGo =
        noGoItems.find((zone) => studioSelection.type === "nogo" && zone.id === studioSelection.id) ??
        null;
      const selectedDock =
        dockItems.find((dock) => studioSelection.type === "dock" && dock.id === studioSelection.id) ??
        null;
      const studioInspectorTitle =
        effectiveSpot?.name ??
        selectedNoGo?.name ??
        selectedDock?.name ??
        `${selectedDeckInfo.label} ${selectedDeckInfo.name}`;
      const studioInspectorMeta =
        effectiveSpot
          ? `${effectiveSpot.kind} · ${effectiveSpot.zoneKey}`
          : selectedNoGo
            ? "금지 구역"
            : selectedDock
              ? selectedDock.kind === "vertical"
                ? "Vertical Portal"
                : "Dock Point"
              : "Deck";
      const effectiveSpotCalibration =
        effectiveSpot?.calibration ?? mapDeck.calibration ?? null;
      const totalSpotCount = studioDecks.reduce(
        (accumulator, deck) => accumulator + (deck.spots?.length ?? 0),
        0
      );
      const totalPortalCount = studioDecks.reduce(
        (accumulator, deck) =>
          accumulator + (deck.docks?.length ?? 0) + (deck.portals?.length ?? 0),
        0
      );

      if (studioViewMode === "library") {
        return (
          <section className="panel-frame studio-shell studio-shell-library">
            <aside className="studio-library-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label" lang="en">
                    Sidebar
                  </p>
                  <h2>맵 라이브러리</h2>
                </div>
              </div>

              <div className="studio-library-block">
                <span className="studio-library-label">Favorites</span>
                <div className="studio-tree-list">
                  <div className="studio-tree-item studio-tree-summary">
                    <span className="studio-tree-icon">ML</span>
                    <div>
                      <strong>Map Library</strong>
                      <small>전체 맵 파일 탐색</small>
                    </div>
                  </div>
                  <div className="studio-tree-item studio-tree-summary">
                    <span className="studio-tree-icon">DR</span>
                    <div>
                      <strong>Drafts</strong>
                      <small>초안 버전 관리</small>
                    </div>
                  </div>
                  <div className="studio-tree-item studio-tree-summary">
                    <span className="studio-tree-icon">AS</span>
                    <div>
                      <strong>Assets</strong>
                      <small>이미지 파일 자산</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="studio-library-block">
                <span className="studio-library-label">Domain</span>
                <div className="studio-tree-list">
                  <div className="studio-tree-item studio-tree-summary">
                    <span className="studio-tree-icon">D</span>
                    <div>
                      <strong>{mapDocument.name}</strong>
                      <small>{studioDraft?.status ?? "draft"}</small>
                    </div>
                  </div>
                  {studioDecks.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      className={`studio-tree-item ${deck.id === studioDeckId ? "is-active" : ""}`}
                      onClick={() => {
                        setStudioDeckId(deck.id);
                        setStudioSelection({ type: "deck", id: deck.id });
                      }}
                    >
                      <span className="studio-tree-icon">{deck.label}</span>
                      <div>
                        <strong>{deck.name}</strong>
                        <small>{deck.spots?.length ?? 0} spots</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="studio-library-block studio-library-meta">
                <span>Domain 1</span>
                <span>Deck {studioDecks.length}</span>
                <span>Spot {totalSpotCount}</span>
                <span>Portal {totalPortalCount}</span>
              </div>
            </aside>

            <div className="studio-browser-panel">
              <div className="studio-browser-header studio-browser-header-library">
                <div>
                  <p className="section-label" lang="en">
                    Browser
                  </p>
                  <h2>{mapDocument.name} 맵 파일 관리</h2>
                </div>
                <div className="studio-breadcrumbs">
                  <span>Map Library</span>
                  <span>{mapDocument.name}</span>
                  <span>{mapDeck.label}</span>
                </div>
              </div>

              <section className="studio-folder-section">
                <div className="panel-heading">
                  <h2>Deck 폴더</h2>
                  <div className="inline-action-group">
                    <span className="meta-pill" lang="en">
                      {studioDecks.length} FOLDERS
                    </span>
                    {canEdit ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={handleCreateDeck}
                        disabled={mapPending}
                      >
                        + Deck
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="studio-folder-grid">
                  {studioDecks.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      className={`studio-folder-card ${deck.id === studioDeckId ? "is-active" : ""}`}
                      onClick={() => {
                        setStudioDeckId(deck.id);
                        setStudioSelection({ type: "deck", id: deck.id });
                      }}
                    >
                      <span className="studio-folder-icon">{deck.label}</span>
                      <strong>{deck.name}</strong>
                      <small>{deck.spots?.length ?? 0} spots</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="studio-folder-section">
                <div className="panel-heading">
                  <h2>맵 파일</h2>
                  <span className="meta-pill" lang="en">
                    OPEN TO EDIT
                  </span>
                </div>
                <div className="studio-file-grid">
                  <button
                    type="button"
                    className="studio-file-card is-primary"
                    onClick={() => setStudioViewMode("editor")}
                  >
                    <span className="studio-file-extension">MAP</span>
                    <strong>{selectedDeckFileName}</strong>
                    <small>초안 버전 {studioDraft?.version ?? "-"}</small>
                    <span className="studio-file-meta">Spot {zoneItems.length} · No-Go {noGoItems.length} · Dock {dockItems.length}</span>
                  </button>

                  <article className="studio-file-card">
                    <span className="studio-file-extension">PNG</span>
                    <strong>{selectedImageFileName}</strong>
                    <small>
                      {mapDeck.image?.width ?? 0} x {mapDeck.image?.height ?? 0}
                    </small>
                    <span className="studio-file-meta">배경 이미지 자산</span>
                  </article>

                  <article className="studio-file-card">
                    <span className="studio-file-extension">PUB</span>
                    <strong>{selectedDeckFileName.replace(".map", ".published")}</strong>
                    <small>배포 버전 {studioBundle.published?.version ?? "-"}</small>
                    <span className="studio-file-meta">관제 반영 기준본</span>
                  </article>
                </div>
              </section>

              <section className="studio-folder-section">
                <div className="panel-heading">
                  <h2>선택 폴더 개요</h2>
                </div>
                <div className="studio-asset-columns">
                  <div className="studio-asset-group">
                    <span className="studio-library-label">Spots</span>
                    <div className="studio-asset-list">
                      {zoneItems.length ? (
                        zoneItems.map((spot) => (
                          <div
                            key={spot.id}
                            className="studio-item-shell"
                            onContextMenu={(event) =>
                              openStudioItemContextMenu(event, {
                                type: "spot",
                                id: spot.id,
                                deckId: mapDeck.id
                              })
                            }
                          >
                            <div className="studio-asset-item">
                              <strong>{spot.name}</strong>
                              <small>{spot.width}px x {spot.height}px</small>
                            </div>
                            {canEdit
                              ? renderStudioItemActions({ type: "spot", id: spot.id, deckId: mapDeck.id })
                              : null}
                          </div>
                        ))
                      ) : (
                        <div className="empty-state compact-empty">등록된 Spot이 없습니다.</div>
                      )}
                    </div>
                  </div>

                  <div className="studio-asset-group">
                    <span className="studio-library-label">No-Go</span>
                    <div className="studio-asset-list">
                      {noGoItems.length ? (
                        noGoItems.map((zone) => (
                          <div
                            key={zone.id}
                            className="studio-item-shell"
                            onContextMenu={(event) =>
                              openStudioItemContextMenu(event, {
                                type: "nogo",
                                id: zone.id,
                                deckId: mapDeck.id
                              })
                            }
                          >
                            <div className="studio-asset-item">
                              <strong>{zone.name}</strong>
                              <small>{zone.width}px x {zone.height}px</small>
                            </div>
                            {canEdit
                              ? renderStudioItemActions({ type: "nogo", id: zone.id, deckId: mapDeck.id })
                              : null}
                          </div>
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
                          <div
                            key={dock.id}
                            className="studio-item-shell"
                            onContextMenu={(event) =>
                              openStudioItemContextMenu(event, {
                                type: "dock",
                                id: dock.id,
                                deckId: mapDeck.id
                              })
                            }
                          >
                            <div className="studio-asset-item">
                              <strong>{dock.name}</strong>
                              <small>{dock.kind ?? "dock"}</small>
                            </div>
                            {canEdit
                              ? renderStudioItemActions({ type: "dock", id: dock.id, deckId: mapDeck.id })
                              : null}
                          </div>
                        ))
                      ) : (
                        <div className="empty-state compact-empty">등록된 도킹 포인트가 없습니다.</div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="studio-inspector-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label" lang="en">
                    Inspector
                  </p>
                  <h2>{mapDeck.label} {mapDeck.name}</h2>
                </div>
                <span className="meta-pill" lang="en">
                  LIBRARY
                </span>
              </div>

              <div className="detail-grid">
                <DetailItem label="Mode" value="Map File Browser" />
                <DetailItem label="Deck" value={`${mapDeck.label} ${mapDeck.name}`} />
                <DetailItem label="Image" value={selectedImageFileName} />
                <DetailItem label="Draft" value={studioDraft?.version ?? "-"} />
                <DetailItem label="Spots" value={zoneItems.length} />
                <DetailItem label="Monitor Unit" value={zoneItems.length === 1 ? zoneItems[0].name : "Deck + Spots"} />
              </div>

              <label className="credential-field">
                <span>Domain 이름</span>
                <input
                  className="credential-input"
                  type="text"
                  value={studioDraft?.name ?? ""}
                  onChange={(event) => updateStudioDomain({ name: event.target.value })}
                  disabled={!canEdit}
                />
              </label>

              <div className="selection-strip">
                <span className="selection-badge">Library Guide</span>
                <strong>맵 파일을 먼저 고른 뒤 편집기로 들어갑니다.</strong>
                <p>맵 관리에서는 폴더, 맵 파일, 배경 이미지 자산을 먼저 확인하고 필요한 파일만 열어 편집합니다.</p>
              </div>

              <div className="studio-action-row">
                {canEdit ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleSaveDomainName}
                    disabled={mapPending}
                  >
                    Domain 저장
                  </button>
                ) : null}
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setStudioViewMode("editor")}
                >
                  선택 파일 열기
                </button>
              </div>
            </aside>
            {renderStudioContextMenu()}
          </section>
        );
      }

      return (
        <section className="panel-frame studio-shell">
          <aside className="studio-library-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label" lang="en">
                  Library
                </p>
                <h2>맵 워크스페이스</h2>
              </div>
            </div>

            <div className="studio-library-block">
              <span className="studio-library-label">Domain</span>
              <div className="studio-tree-item studio-tree-summary">
                <span className="studio-tree-icon">D</span>
                <div>
                  <strong>{mapDocument.name}</strong>
                  <small>{studioDraft?.status ?? "draft"}</small>
                </div>
              </div>
            </div>

            <div className="studio-library-block">
              <span className="studio-library-label">Decks</span>
                <div className="studio-tree-list">
                  {studioDecks.map((deck) => (
                    <div
                      key={deck.id}
                      className="studio-item-shell"
                      onContextMenu={(event) =>
                        openStudioItemContextMenu(event, { type: "deck", id: deck.id })
                      }
                    >
                      <button
                        type="button"
                        className={`studio-tree-item ${deck.id === studioDeckId ? "is-active" : ""}`}
                        onClick={() => {
                          setStudioDeckId(deck.id);
                          setStudioSelection({ type: "deck", id: deck.id });
                        }}
                      >
                        <span className="studio-tree-icon">{deck.label}</span>
                        <div>
                          <strong>{deck.name}</strong>
                          <small>{deck.spots?.length ?? 0} spots</small>
                        </div>
                      </button>
                      {canEdit ? renderStudioItemActions({ type: "deck", id: deck.id }) : null}
                    </div>
                  ))}
                </div>
              </div>

            <div className="studio-library-block studio-library-meta">
              <span>Domain 1</span>
              <span>Deck {studioDecks.length}</span>
              <span>Spot {totalSpotCount}</span>
              <span>Portal {totalPortalCount}</span>
            </div>
          </aside>

          <div className="studio-browser-panel">
            <div className="studio-browser-header">
              <div>
                <p className="section-label" lang="en">
                  Browser
                </p>
                <h2>
                  {mapDocument.name} / {mapDeck.label} {mapDeck.name}
                </h2>
              </div>
              <div className="studio-breadcrumbs">
                <button
                  type="button"
                  className="studio-breadcrumb-button"
                  onClick={() => setStudioViewMode("library")}
                >
                  Map Library
                </button>
                <span>Domain</span>
                <span>{mapDocument.name}</span>
                <span>{mapDeck.label}</span>
              </div>
            </div>

            <section className="studio-folder-section">
              <div className="panel-heading">
                <h2>Deck 폴더</h2>
                {canEdit ? (
                  <div className="inline-action-group">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={handleCreateDeck}
                      disabled={mapPending}
                    >
                      + Deck
                    </button>
                    <button
                      type="button"
                      className="ghost-button danger-button"
                      onClick={handleDeleteDeck}
                      disabled={mapPending || studioDecks.length <= 1}
                    >
                      Deck 삭제
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="studio-folder-grid">
                {studioDecks.map((deck) => (
                  <div
                    key={deck.id}
                    className="studio-item-shell studio-item-shell-card"
                    onContextMenu={(event) =>
                      openStudioItemContextMenu(event, { type: "deck", id: deck.id })
                    }
                  >
                    <button
                      type="button"
                      className={`studio-folder-card ${deck.id === studioDeckId ? "is-active" : ""}`}
                      onClick={() => {
                        setStudioDeckId(deck.id);
                        setStudioSelection({ type: "deck", id: deck.id });
                      }}
                    >
                      <span className="studio-folder-icon">{deck.label}</span>
                      <strong>{deck.name}</strong>
                      <small>{deck.spots?.length ?? 0} spots</small>
                    </button>
                    {canEdit ? renderStudioItemActions({ type: "deck", id: deck.id }) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="studio-folder-section">
              <div className="panel-heading">
                <h2>선택 Deck 구성요소</h2>
              </div>
              <div className="studio-asset-columns">
                <div className="studio-asset-group">
                  <div className="studio-group-header">
                    <span className="studio-library-label">Spots</span>
                    {canEdit ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleCreateStudioItem("spot")}
                        disabled={mapPending}
                      >
                        + Spot
                      </button>
                    ) : null}
                  </div>
                  <div className="studio-asset-list">
                    {zoneItems.map((spot) => (
                      <div
                        key={spot.id}
                        className="studio-item-shell"
                        onContextMenu={(event) =>
                          openStudioItemContextMenu(event, {
                            type: "spot",
                            id: spot.id,
                            deckId: mapDeck.id
                          })
                        }
                      >
                        <button
                          type="button"
                          className={`studio-asset-item ${
                            studioSelection.type === "spot" && studioSelection.id === spot.id
                              ? "is-active"
                              : ""
                          }`}
                          onClick={() => setStudioSelection({ type: "spot", id: spot.id })}
                        >
                          <strong>{spot.name}</strong>
                          <small>{spot.width}px x {spot.height}px</small>
                        </button>
                        {canEdit
                          ? renderStudioItemActions({ type: "spot", id: spot.id, deckId: mapDeck.id })
                          : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="studio-asset-group">
                  <div className="studio-group-header">
                    <span className="studio-library-label">No-Go</span>
                    {canEdit ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleCreateStudioItem("nogo")}
                        disabled={mapPending}
                      >
                        + No-Go
                      </button>
                    ) : null}
                  </div>
                  <div className="studio-asset-list">
                    {noGoItems.length ? (
                      noGoItems.map((zone) => (
                        <div
                          key={zone.id}
                          className="studio-item-shell"
                          onContextMenu={(event) =>
                            openStudioItemContextMenu(event, {
                              type: "nogo",
                              id: zone.id,
                              deckId: mapDeck.id
                            })
                          }
                        >
                          <button
                            type="button"
                            className={`studio-asset-item ${
                              studioSelection.type === "nogo" && studioSelection.id === zone.id
                                ? "is-active"
                                : ""
                            }`}
                            onClick={() => setStudioSelection({ type: "nogo", id: zone.id })}
                          >
                            <strong>{zone.name}</strong>
                            <small>
                              {zone.width}px x {zone.height}px
                            </small>
                          </button>
                          {canEdit
                            ? renderStudioItemActions({ type: "nogo", id: zone.id, deckId: mapDeck.id })
                            : null}
                        </div>
                      ))
                    ) : (
                      <div className="empty-state compact-empty">등록된 금지 구역이 없습니다.</div>
                    )}
                  </div>
                </div>

                <div className="studio-asset-group">
                  <div className="studio-group-header">
                    <span className="studio-library-label">Docks & Portals</span>
                    {canEdit ? (
                      <div className="inline-action-group">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleCreateStudioItem("dock")}
                          disabled={mapPending}
                        >
                          + Dock
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleCreateStudioItem("portal")}
                          disabled={mapPending}
                        >
                          + Portal
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="studio-asset-list">
                    {dockItems.length ? (
                      dockItems.map((dock) => (
                        <div
                          key={dock.id}
                          className="studio-item-shell"
                          onContextMenu={(event) =>
                            openStudioItemContextMenu(event, {
                              type: "dock",
                              id: dock.id,
                              deckId: mapDeck.id
                            })
                          }
                        >
                          <button
                            type="button"
                            className={`studio-asset-item ${
                              studioSelection.type === "dock" && studioSelection.id === dock.id
                                ? "is-active"
                                : ""
                            }`}
                            onClick={() => setStudioSelection({ type: "dock", id: dock.id })}
                          >
                            <strong>{dock.name}</strong>
                            <small>{dock.kind ?? "dock"}</small>
                          </button>
                          {canEdit
                            ? renderStudioItemActions({ type: "dock", id: dock.id, deckId: mapDeck.id })
                            : null}
                        </div>
                      ))
                    ) : (
                      <div className="empty-state compact-empty">등록된 도킹 포인트가 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="studio-preview-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label" lang="en">
                    Preview
                  </p>
                  <h2>
                    {mapDeck.label} {mapDeck.name}
                  </h2>
                </div>
                <span className="meta-pill" lang="en">
                  {mapDeck.image.width} x {mapDeck.image.height}
                </span>
              </div>
              <MapCanvas
                deck={mapDeck}
                robots={deckRobots}
                accessibleSpotIds={monitorMap.accessibleSpotIds}
                selectedRobotId={selectedRobotId}
                selectedNode={studioSelection}
                onSelectRobot={(robot) => setSelectedRobotId(robot.id)}
                onCanvasClick={canEdit ? handleStudioOriginPick : undefined}
                onSelectSpot={(spot) => setStudioSelection({ type: "spot", id: spot.id })}
                onSelectNoGo={(zone) => setStudioSelection({ type: "nogo", id: zone.id })}
                onSelectDock={(dock) => setStudioSelection({ type: "dock", id: dock.id })}
                showSpots
                showNoGo
                showDocks
              />
            </section>
          </div>

          <aside className="studio-inspector-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label" lang="en">
                  Inspector
                </p>
                <h2>{studioInspectorTitle}</h2>
              </div>
              <span className="meta-pill" lang="en">
                {studioInspectorMeta}
              </span>
            </div>

            <div className="map-overview compact-meta-list">
              <span>선택 항목 {studioInspectorMeta}</span>
              <span>초안 버전 {studioDraft?.version ?? "-"}</span>
              <span>배포 버전 {studioBundle.published?.version ?? "-"}</span>
            </div>

            {effectiveSpot ? (
              <>
                <div className="studio-two-column">
                  <label className="credential-field">
                    <span>Spot 이름</span>
                    <input
                      className="credential-input"
                      type="text"
                      value={effectiveSpot.name}
                      onChange={(event) => updateStudioSpot(effectiveSpot.id, { name: event.target.value })}
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="credential-field">
                    <span>Zone Key</span>
                    <input
                      className="credential-input"
                      type="text"
                      value={effectiveSpot.zoneKey}
                      onChange={(event) =>
                        updateStudioSpot(effectiveSpot.id, { zoneKey: event.target.value })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                </div>

                <div className="detail-grid">
                  <DetailItem label="Zone" value={effectiveSpot.zoneKey} />
                  <DetailItem label="Width" value={`${effectiveSpot.width}px`} />
                  <DetailItem label="Height" value={`${effectiveSpot.height}px`} />
                  <DetailItem label="Position" value={`${effectiveSpot.x}, ${effectiveSpot.y}`} />
                </div>

                <div className="studio-two-column">
                  <label className="credential-field">
                    <span>X</span>
                    <input
                      className="credential-input"
                      type="number"
                      value={effectiveSpot.x}
                      onChange={(event) =>
                        updateStudioSpot(effectiveSpot.id, { x: Number(event.target.value || 0) })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="credential-field">
                    <span>Y</span>
                    <input
                      className="credential-input"
                      type="number"
                      value={effectiveSpot.y}
                      onChange={(event) =>
                        updateStudioSpot(effectiveSpot.id, { y: Number(event.target.value || 0) })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                </div>

                <div className="studio-two-column">
                  <label className="credential-field">
                    <span>Width</span>
                    <input
                      className="credential-input"
                      type="number"
                      min="1"
                      value={effectiveSpot.width}
                      onChange={(event) =>
                        updateStudioSpot(effectiveSpot.id, {
                          width: Number(event.target.value || effectiveSpot.width)
                        })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="credential-field">
                    <span>Height</span>
                    <input
                      className="credential-input"
                      type="number"
                      min="1"
                      value={effectiveSpot.height}
                      onChange={(event) =>
                        updateStudioSpot(effectiveSpot.id, {
                          height: Number(event.target.value || effectiveSpot.height)
                        })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                </div>
              </>
            ) : null}

            {selectedNoGo ? (
              <>
                <label className="credential-field">
                  <span>No-Go 이름</span>
                  <input
                    className="credential-input"
                    type="text"
                    value={selectedNoGo.name}
                    onChange={(event) => updateStudioNoGo(selectedNoGo.id, { name: event.target.value })}
                    disabled={!canEdit}
                  />
                </label>

                <div className="detail-grid">
                  <DetailItem label="Type" value="Restricted" />
                  <DetailItem label="Width" value={`${selectedNoGo.width}px`} />
                  <DetailItem label="Height" value={`${selectedNoGo.height}px`} />
                  <DetailItem label="Position" value={`${selectedNoGo.x}, ${selectedNoGo.y}`} />
                </div>

                <div className="studio-two-column">
                  <label className="credential-field">
                    <span>X</span>
                    <input
                      className="credential-input"
                      type="number"
                      value={selectedNoGo.x}
                      onChange={(event) =>
                        updateStudioNoGo(selectedNoGo.id, { x: Number(event.target.value || 0) })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="credential-field">
                    <span>Y</span>
                    <input
                      className="credential-input"
                      type="number"
                      value={selectedNoGo.y}
                      onChange={(event) =>
                        updateStudioNoGo(selectedNoGo.id, { y: Number(event.target.value || 0) })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                </div>

                <div className="studio-two-column">
                  <label className="credential-field">
                    <span>Width</span>
                    <input
                      className="credential-input"
                      type="number"
                      min="1"
                      value={selectedNoGo.width}
                      onChange={(event) =>
                        updateStudioNoGo(selectedNoGo.id, { width: Number(event.target.value || 1) })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="credential-field">
                    <span>Height</span>
                    <input
                      className="credential-input"
                      type="number"
                      min="1"
                      value={selectedNoGo.height}
                      onChange={(event) =>
                        updateStudioNoGo(selectedNoGo.id, { height: Number(event.target.value || 1) })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                </div>
              </>
            ) : null}

            {selectedDock ? (
              <>
                <div className="studio-two-column">
                  <label className="credential-field">
                    <span>{selectedDock.kind === "vertical" ? "Portal 이름" : "Dock 이름"}</span>
                    <input
                      className="credential-input"
                      type="text"
                      value={selectedDock.name}
                      onChange={(event) => updateStudioDock(selectedDock.id, { name: event.target.value })}
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="credential-field">
                    <span>Kind</span>
                    <input
                      className="credential-input"
                      type="text"
                      value={selectedDock.kind ?? "dock"}
                      disabled
                    />
                  </label>
                </div>

                <div className="detail-grid">
                  <DetailItem label="Kind" value={selectedDock.kind ?? "dock"} />
                  <DetailItem label="Position" value={`${selectedDock.x}, ${selectedDock.y}`} />
                  <DetailItem label="Target" value={selectedDock.targetDeckId ?? "-"} />
                  <DetailItem label="Deck" value={`${mapDeck.label} ${mapDeck.name}`} />
                </div>

                <div className="studio-two-column">
                  <label className="credential-field">
                    <span>X</span>
                    <input
                      className="credential-input"
                      type="number"
                      value={selectedDock.x}
                      onChange={(event) =>
                        updateStudioDock(selectedDock.id, { x: Number(event.target.value || 0) })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="credential-field">
                    <span>Y</span>
                    <input
                      className="credential-input"
                      type="number"
                      value={selectedDock.y}
                      onChange={(event) =>
                        updateStudioDock(selectedDock.id, { y: Number(event.target.value || 0) })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                </div>

                {selectedDock.kind === "vertical" ? (
                  <label className="credential-field">
                    <span>Target Deck</span>
                    <select
                      className="credential-input"
                      value={selectedDock.targetDeckId ?? ""}
                      onChange={(event) =>
                        updateStudioDock(selectedDock.id, {
                          targetDeckId: event.target.value || null
                        })
                      }
                      disabled={!canEdit}
                    >
                      <option value="">미연결</option>
                      {studioDecks
                        .filter((deck) => deck.id !== mapDeck.id)
                        .map((deck) => (
                          <option key={deck.id} value={deck.id}>
                            {deck.label} {deck.name}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
              </>
            ) : null}

            {effectiveSpot ? (
              <>
                <div className="selection-strip">
                  <span className="selection-badge">Spot Calibration</span>
                  <strong>{effectiveSpot.name}</strong>
                  <p>원점은 선택한 Spot에만 저장됩니다. Spot 하나만 있는 Deck은 자동으로 해당 Spot이 기준이 됩니다.</p>
                </div>

                <div className="studio-two-column">
                  <label className="credential-field">
                    <span>Resolution (m/px)</span>
                    <input
                      className="credential-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={effectiveSpotCalibration?.resolution ?? 0.05}
                      onChange={(event) =>
                        updateStudioSpot(effectiveSpot.id, {
                          calibration: {
                            resolution: Number(event.target.value || 0.05)
                          }
                        })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="credential-field">
                    <span>Grid (m)</span>
                    <input
                      className="credential-input"
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={effectiveSpotCalibration?.gridMeters ?? 1}
                      onChange={(event) =>
                        updateStudioSpot(effectiveSpot.id, {
                          calibration: {
                            gridMeters: Number(event.target.value || 1)
                          }
                        })
                      }
                      disabled={!canEdit}
                    />
                  </label>
                </div>

                <label className="credential-field">
                  <span>Orientation (deg)</span>
                  <input
                    className="credential-input"
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={effectiveSpotCalibration?.rotation ?? 0}
                    onChange={(event) =>
                      updateStudioSpot(effectiveSpot.id, {
                        calibration: {
                          rotation: Number(event.target.value)
                        }
                      })
                    }
                    disabled={!canEdit}
                  />
                </label>

                <div className="selection-strip">
                  <span className="selection-badge">Origin</span>
                  <strong>
                    x {Math.round(effectiveSpotCalibration?.origin?.x ?? 0)} / y{" "}
                    {Math.round(effectiveSpotCalibration?.origin?.y ?? 0)}
                  </strong>
                  <p>프리뷰를 클릭하면 현재 선택된 Spot 원점이 해당 픽셀로 저장됩니다.</p>
                </div>
              </>
            ) : !selectedNoGo && !selectedDock ? (
              <>
                <label className="credential-field">
                  <span>Domain 이름</span>
                  <input
                    className="credential-input"
                    type="text"
                    value={studioDraft?.name ?? ""}
                    onChange={(event) => updateStudioDomain({ name: event.target.value })}
                    disabled={!canEdit}
                  />
                </label>

                <div className="studio-two-column">
                  <label className="credential-field">
                    <span>Deck Label</span>
                    <input
                      className="credential-input"
                      type="text"
                      value={mapDeck.label}
                      onChange={(event) => updateStudioDeck({ label: event.target.value })}
                      disabled={!canEdit}
                    />
                  </label>
                  <label className="credential-field">
                    <span>Deck 이름</span>
                    <input
                      className="credential-input"
                      type="text"
                      value={mapDeck.name}
                      onChange={(event) => updateStudioDeck({ name: event.target.value })}
                      disabled={!canEdit}
                    />
                  </label>
                </div>

                <label className="credential-field">
                  <span>작업 Deck</span>
                  <select
                    className="credential-input"
                    value={studioDeckId}
                    onChange={(event) => {
                      setStudioDeckId(event.target.value);
                      setStudioSelection({ type: "deck", id: event.target.value });
                    }}
                    disabled={!canEdit}
                  >
                    {studioDecks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.label} {deck.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="credential-field">
                  <span>커스텀 맵 이미지</span>
                  <input
                    className="credential-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleMapImageUpload}
                    disabled={!canEdit || mapPending}
                  />
                </label>

                <div className="detail-grid">
                  <DetailItem label="Image" value={mapDeck.image?.name ?? "-"} />
                  <DetailItem label="Size" value={`${mapDeck.image?.width ?? 0} x ${mapDeck.image?.height ?? 0}`} />
                  <DetailItem label="Spots" value={mapDeck.spots?.length ?? 0} />
                  <DetailItem
                    label="Monitor Unit"
                    value={mapDeck.spots?.length === 1 ? mapDeck.spots[0].name : "Deck + Spots"}
                  />
                </div>

                <div className="selection-strip">
                  <span className="selection-badge">Editing Guide</span>
                  <strong>Spot을 선택한 뒤 좌표 기준을 설정하세요.</strong>
                  <p>원점과 해상도는 Deck 전체가 아니라 선택된 Spot 기준으로 관리됩니다.</p>
                </div>
              </>
            ) : null}

            <div className="map-overview compact-meta-list">
              <span>안내: Spot 선택 후 프리뷰를 클릭하면 해당 Spot 원점이 갱신됩니다.</span>
              <span>Spot-only 프로젝트는 Spot 자체를 통합관제 기본 단위로 취급합니다.</span>
            </div>

            {mapNotice ? (
              <div className="selection-strip">
                <strong>{mapNotice}</strong>
              </div>
            ) : null}
            {mapError ? (
              <div className="selection-strip is-alert">
                <strong className="selection-text is-alert">{mapError}</strong>
              </div>
            ) : null}

            <div className="studio-action-row">
              {canEdit && studioSelection.type !== "deck" ? (
                <button
                  type="button"
                  className="ghost-button danger-button"
                  onClick={handleDeleteStudioSelection}
                  disabled={mapPending}
                >
                  선택 삭제
                </button>
              ) : null}
              <button
                type="button"
                className="ghost-button"
                onClick={handleSaveMapDraft}
                disabled={!canEdit || mapPending}
              >
                {mapPending ? "저장 중..." : "초안 저장"}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handlePublishMap}
                disabled={!canEdit || mapPending}
              >
                관제 배포
              </button>
            </div>
          </aside>
          {renderStudioContextMenu()}
        </section>
      );
    }

    return (
      <section className="panel-frame map-ops-shell">
        <div className="map-ops-canvas">
          <div className="monitor-floating monitor-breadcrumb">
            <p className="section-label" lang="en">
              Map
            </p>
            <strong>
              {mapDocument.name} / {mapDeck.label} {mapDeck.name}
            </strong>
            <div className="deck-switcher">
              {(mapDocument.decks ?? []).map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  className={`deck-chip ${deck.id === mapDeck.id ? "is-active" : ""}`}
                  onClick={() => setActiveDeckId(deck.id)}
                >
                  {deck.label}
                </button>
              ))}
            </div>
          </div>

          <MapCanvas
            deck={mapDeck}
            robots={deckRobots}
            accessibleSpotIds={monitorMap.accessibleSpotIds}
            selectedRobotId={selectedRobotId}
            onSelectRobot={(robot) => {
              setSelectedRobotId(robot.id);
              setActiveDeckId(robot.mapPose?.deckId ?? mapDeck.id);
            }}
            showSpots
            showNoGo={activeSubTab === "map-nogo"}
            showDocks={activeSubTab === "map-dock"}
          />
        </div>

        <div className="map-ops-side">
          <div className="panel-heading">
            <h2>
              {activeSubTab === "map-zones"
                ? "구역 목록"
                : activeSubTab === "map-nogo"
                  ? "금지 구역"
                  : "도킹 및 포털"}
            </h2>
          </div>
          <div className="menu-list compact-list">
            {(activeSubTab === "map-zones"
              ? zoneItems
              : activeSubTab === "map-nogo"
                ? noGoItems
                : dockItems
            ).map((item) => (
              <article key={item.id} className="menu-list-item">
                <strong>{item.name}</strong>
                <span>
                  {activeSubTab === "map-zones"
                    ? item.zoneKey
                    : activeSubTab === "map-nogo"
                      ? "접근 제한"
                      : item.kind ?? "dock"}
                </span>
                {item.targetDeckId ? <small>{item.targetDeckId}</small> : null}
              </article>
            ))}
          </div>
          <div className="map-overview compact-meta-list">
            <span>활성 구역 {zoneItems.length}</span>
            <span>금지 구역 {noGoItems.length}</span>
            <span>도킹/포털 {dockItems.length}</span>
            <span>접근 허용 {session.zones.join(", ")}</span>
          </div>
        </div>
      </section>
    );
  }

  function renderEventLayout() {
    const timelineItems =
      activeSubTab === "event-timeline"
        ? eventItems.map((item, index) => ({
            ...item,
            detail: `${index + 1}분 전 · ${item.detail}`
          }))
        : eventItems;

    if (activeSubTab === "event-report") {
      const highLevelCount = eventItems.filter((item) => item.level === "high").length;
      const mediumLevelCount = eventItems.filter((item) => item.level === "medium").length;
      const lowLevelCount = eventItems.filter((item) => item.level === "low").length;

      return (
        <>
          <section className="summary-grid">
            <SummaryCard label="총 사건" value={eventItems.length} />
            <SummaryCard label="고위험" value={highLevelCount} />
            <SummaryCard label="주의" value={mediumLevelCount} />
            <SummaryCard label="참고" value={lowLevelCount} />
          </section>
          <section className="panel-frame menu-layout menu-event-layout">
            <div className="panel-heading">
              <h2>사건 요약 리포트</h2>
            </div>
            <div className="menu-list compact-list">
              {eventItems.length ? (
                eventItems.slice(0, 8).map((item) => (
                  <article key={item.id} className={`menu-list-item level-${item.level}`}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </article>
                ))
              ) : (
                <div className="empty-state">요약할 사건이 없습니다.</div>
              )}
            </div>
          </section>
        </>
      );
    }

    if (activeSubTab === "event-export") {
      const exportItems = [
        {
          id: "exp-live",
          name: "실시간 사건 스트림",
          desc: `${eventItems.length}건 준비됨`
        },
        {
          id: "exp-timeline",
          name: "타임라인 로그",
          desc: `${timelineItems.length}건 집계됨`
        },
        {
          id: "exp-audit",
          name: "감사 로그",
          desc: `${auditEntries.length}건 조회 가능`
        }
      ];

      return (
        <section className="panel-frame menu-layout menu-event-layout">
          <div className="panel-heading">
            <h2>사건 내보내기</h2>
            <span className="meta-pill" lang="en">
              EXPORT
            </span>
          </div>
          <div className="menu-list">
            {exportItems.map((item) => (
              <article key={item.id} className="menu-list-item">
                <strong>{item.name}</strong>
                <span>{item.desc}</span>
                <small>기준 시각 {formatSyncTime(lastSync)}</small>
              </article>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="panel-frame menu-layout menu-event-layout">
        <div className="panel-heading">
          <h2>{activeSubTab === "event-timeline" ? "사건 타임라인" : "실시간 사건"}</h2>
        </div>
        <div className="menu-list compact-list">
          {timelineItems.length ? (
            timelineItems.slice(0, 10).map((item) => (
              <article key={item.id} className={`menu-list-item level-${item.level}`}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </article>
            ))
          ) : (
            <div className="empty-state">현재 발생한 사건이 없습니다.</div>
          )}
        </div>
      </section>
    );
  }

  function renderAccessLayout() {
    if (activeSubTab === "access-teams") {
      return (
        <section className="panel-frame menu-layout menu-access-layout">
          <div className="panel-heading">
            <h2>팀 단위 가시성</h2>
            <span className="meta-pill" lang="en">
              {teamSummaries.length} TEAMS
            </span>
          </div>
          <div className="menu-list compact-list">
            {teamSummaries.length ? (
              teamSummaries.map((team) => (
                <article key={team.id} className="menu-list-item">
                  <strong>
                    {team.name} ({team.code})
                  </strong>
                  <span>팀원 {team.members}명</span>
                  <small>온라인 {team.onlineMembers}명</small>
                </article>
              ))
            ) : (
              <div className="empty-state">표시할 팀이 없습니다.</div>
            )}
          </div>
        </section>
      );
    }

    if (activeSubTab === "access-graph") {
      if (session.role === "root") {
        return (
          <TeamNodePlanner
            session={session}
            teamGraph={teamGraph}
            pending={plannerPending}
            error={plannerError}
            teamNameInput={teamNameInput}
            setTeamNameInput={setTeamNameInput}
            teamCodeInput={teamCodeInput}
            setTeamCodeInput={setTeamCodeInput}
            onCreateTeam={handleCreateTeam}
            onAssignTeam={handleAssignTeam}
            onMoveNode={handleMoveNode}
          />
        );
      }

      return (
        <section className="panel-frame menu-layout menu-access-layout">
          <div className="panel-heading">
            <h2>팀 노드 그래프</h2>
          </div>
          <div className="selection-strip">
            <strong>운영자/모니터는 읽기 전용 그래프만 열람할 수 있습니다.</strong>
          </div>
          <NodeGraphBoard
            teams={teamGraph.teams}
            accounts={teamGraph.accounts}
            canEdit={false}
            onMoveNode={handleMoveNode}
          />
        </section>
      );
    }

    if (activeSubTab === "access-audit") {
      return (
        <section className="panel-frame menu-layout menu-access-layout">
          <div className="panel-heading">
            <h2>권한 감사 로그</h2>
          </div>
          <div className="menu-list compact-list">
            {auditEntries.length ? (
              auditEntries.map((entry) => (
                <article key={entry.id} className="menu-list-item">
                  <strong>{entry.headline}</strong>
                  <span>{entry.detail}</span>
                  <small>{entry.stamp}</small>
                </article>
              ))
            ) : (
              <div className="empty-state">로그가 없습니다.</div>
            )}
          </div>
        </section>
      );
    }

    return (
      <section className="panel-frame menu-layout menu-access-layout">
        <div className="panel-heading">
          <h2>{session.role === "root" ? "계정 및 팀 가시성" : "내 권한 계정 목록"}</h2>
        </div>
        {renderAccountList(visibleAccounts.slice(0, 10))}
      </section>
    );
  }

  function renderSettingsLayout() {
    const settingMap = {
      "settings-system": [
        {
          key: "system-health",
          title: "시스템 상태",
          copy: `정상 작동 / 마지막 동기화 ${formatSyncTime(lastSync)}`
        },
        { key: "session", title: "세션 정책", copy: "권한 기반 세션 검증 활성화" },
        { key: "log", title: "로그 보존", copy: "운영 로그 90일 순환 저장" }
      ],
      "settings-network": [
        { key: "net-main", title: "제어망", copy: "내부 우선 / 외부 트래픽 제한" },
        { key: "net-zone", title: "구역 라우팅", copy: `허용 구역: ${session.zones.join(", ")}` },
        { key: "net-alert", title: "연결 감시", copy: "지연 200ms 초과 시 경고" }
      ],
      "settings-integration": [
        { key: "int-map", title: "맵 연동", copy: "맵 스튜디오 데이터 동기화 중" },
        { key: "int-event", title: "사건 연동", copy: "실시간 사건 스트림 수신" },
        { key: "int-export", title: "외부 보고", copy: "리포트 API 송신 대기" }
      ],
      "settings-policy": [
        { key: "policy-role", title: "권한 정책", copy: "ROOT / 운영자 / 모니터 분리 적용" },
        { key: "policy-audit", title: "감사 정책", copy: "권한 변경 시 즉시 감사 로그 기록" },
        { key: "policy-access", title: "접근 정책", copy: "비인증 사용자 계정 목록 비노출" }
      ]
    };
    const items = settingMap[activeSubTab] ?? settingMap["settings-system"];

    return (
      <section className="panel-frame menu-layout menu-settings-layout">
        <div className="menu-list">
          {items.map((item) => (
            <article key={item.key} className="menu-list-item">
              <strong>{item.title}</strong>
              <span>{item.copy}</span>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderMenuLayout() {
    switch (activeTopTab) {
      case "fleet":
        return renderFleetLayout();
      case "mission":
        return renderMissionLayout();
      case "map":
        return renderMapLayout();
      case "event":
        return renderEventLayout();
      case "access":
        return renderAccessLayout();
      case "settings":
        return renderSettingsLayout();
      case "integrated":
      default:
        return renderIntegratedLayout();
    }
  }

  if (!session) {
    return (
      <div className={`desktop-window-root ${isDesktopApp ? "is-desktop" : ""}`}>
        {isDesktopApp ? <WindowTitleBar title="HAECHI Control Center" /> : null}
        <div className="desktop-window-content screen-shell screen-login">
          <div className="panel-frame login-layout">
          <section className="login-intro">
            <div className="brand-row">
              <div className="brand-mark">
                <img className="brand-logo" src={logoImage} alt="HAECHI logo" />
              </div>
              <p className="section-label" lang="en">
                Robotics Security Gateway
              </p>
            </div>

            <div className="intro-copy">
              <h2>시스템 접근 권한 인증</h2>
              <p>
                계정 인증을 통과한 사용자만 권한 범위가 자동 분배됩니다. 로그인 전에는
                어떤 계정 목록도 노출되지 않습니다.
              </p>
            </div>

            <div className="system-table">
              <div className="system-row">
                <span>상태</span>
                <strong className="value-ok">정상 작동</strong>
              </div>
              <div className="system-row">
                <span>인증 정책</span>
                <strong>계정 기반 접근 통제</strong>
              </div>
              <div className="system-row">
                <span>로그인 모드</span>
                <strong lang="en">Secure Access</strong>
              </div>
            </div>

            <p className="version-label" lang="en">
              v 2.41.99 | secure gateway
            </p>
          </section>

          <section className="login-panel">
            <div className="panel-heading">
              <p className="section-label">계정 인증</p>
              <h2>계속하려면 권한을 인증받으시오.</h2>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              <div className="credential-grid">
                <label className="credential-field">
                  <span lang="en">ID</span>
                  <input
                    className="credential-input"
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={usernameInput}
                    onChange={(event) => setUsernameInput(event.target.value)}
                    placeholder="아이디를 입력하세요"
                  />
                </label>
                <label className="credential-field">
                  <span lang="en">PASSWORD</span>
                  <input
                    className="credential-input"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                    placeholder="비밀번호를 입력하세요"
                  />
                </label>
              </div>

              <div className={`selection-strip ${isLoginNoticeError ? "is-alert" : ""}`}>
                <span className={`selection-badge ${isLoginNoticeError ? "is-alert" : ""}`}>
                  {isLoginNoticeError ? "경고" : "안내"}
                </span>
                <strong className={`selection-text ${isLoginNoticeError ? "is-alert" : ""}`}>
                  {loginNotice}
                </strong>
              </div>

              <div className="role-guide" aria-label="권한별 설명">
                {roleGuideItems.map((item) => (
                  <article key={item.role} className={`role-guide-item role-${item.role}`}>
                    <div className="role-guide-head">
                      <RoleGuideIcon role={item.role} />
                      <strong>{item.title}</strong>
                    </div>
                    <p>{item.summary}</p>
                  </article>
                ))}
              </div>

              <button
                type="submit"
                className="primary-button login-submit"
                disabled={!canSubmitLogin}
              >
                {loginPending ? "세션 연결 중..." : "접속"}
              </button>
            </form>
          </section>
          </div>
          <ActionModal modal={appModal} onClose={closeAppModal} />
        </div>
      </div>
    );
  }

  return (
    <div className={`desktop-window-root ${isDesktopApp ? "is-desktop" : ""}`}>
      {isDesktopApp ? <WindowTitleBar title="HAECHI Control Center" /> : null}
      <div className="desktop-window-content screen-shell screen-dashboard">
        <div className="dashboard-shell">
        <header className="global-topbar">
          <div className="global-brand">
            <div className="brand-mark">
              <img className="brand-logo" src={logoImage} alt="HAECHI logo" />
            </div>
            <strong lang="en">HAECHI</strong>
          </div>

          <nav className="global-nav" aria-label="메뉴">
            <span className="global-nav-caption">메뉴</span>
            {topNavConfig.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`global-nav-item ${tab.key === activeTopTab ? "is-active" : ""}`}
                onClick={() => setActiveTopTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="global-actions">
            <div className="search-shell">
              <span className="search-prefix" lang="en">
                system.haechi.io/control
              </span>
              <span className="search-shortcut" lang="en">
                Q
              </span>
            </div>
            <span className="alert-chip">실시간 {onlineAccounts}</span>
            <div className="user-chip">
              <span className="user-badge">{session.badge}</span>
              <span>{session.name}</span>
            </div>
          </div>
        </header>

        <div className="workspace-shell">
          <aside className="left-rail" aria-label={`${activeTopConfig.label} 툴박스`}>
            <p className="toolbox-caption">툴박스</p>
            {activeTopConfig.subItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rail-button ${activeSubTab === item.id ? "is-active" : ""}`}
                onClick={() => {
                  setActiveSubTab(item.id);

                  if (item.id === "map-studio") {
                    setStudioViewMode("library");
                  }
                }}
                aria-label={item.label}
                title={item.label}
              >
                <span className="rail-symbol">{item.symbol}</span>
                <span className="rail-short-label" lang="en">
                  {item.shortLabel}
                </span>
              </button>
            ))}
          </aside>

          {dashboardLoading ? (
            <main className="workspace-main">
              <div className="loading-panel">대시보드를 준비하는 중입니다.</div>
            </main>
          ) : dashboardError ? (
            <main className="workspace-main">
              <div className="loading-panel is-error">{dashboardError}</div>
            </main>
          ) : (
            <main className="workspace-main">
              <section className="panel-frame workspace-header">
                <div>
                  <p className="section-label" lang="en">
                    HAECHI access session
                  </p>
                  <h1>{menuTitleMap[activeTopTab] ?? menuTitleMap.integrated}</h1>
                  <p className="topbar-copy">{menuCopyMap[activeTopTab] ?? menuCopyMap.integrated}</p>
                </div>

                <div className="workspace-header-side">
                  <div className="session-card">
                    <div>
                      <span className="session-eyebrow">{roleMeta[session.role]?.title}</span>
                      <strong>{session.name}</strong>
                      <p>{session.email}</p>
                    </div>
                    <button type="button" className="ghost-button" onClick={handleLogout}>
                      로그아웃
                    </button>
                  </div>
                </div>
              </section>
              {renderMenuLayout()}
            </main>
          )}
        </div>
        </div>
        <ActionModal modal={appModal} onClose={closeAppModal} />
      </div>
    </div>
  );
}

function TeamNodePlanner({
  session,
  teamGraph,
  pending,
  error,
  teamNameInput,
  setTeamNameInput,
  teamCodeInput,
  setTeamCodeInput,
  onCreateTeam,
  onAssignTeam,
  onMoveNode
}) {
  const accountsForAssign = teamGraph.accounts.filter((account) => account.role !== "root");

  return (
    <section className="panel-frame team-planner">
      <div className="panel-heading">
        <div>
          <p className="section-label" lang="en">
            Team Node Planner
          </p>
          <h2>팀 생성 및 인원 배치</h2>
        </div>
        <span className="meta-pill" lang="en">
          {teamGraph.teams.length} teams
        </span>
      </div>

      <div className="team-planner-grid">
        <div className="planner-panel">
          <form className="team-create-form" onSubmit={onCreateTeam}>
            <input
              className="planner-input"
              type="text"
              value={teamNameInput}
              onChange={(event) => setTeamNameInput(event.target.value)}
              placeholder="팀 이름"
              disabled={pending}
            />
            <input
              className="planner-input"
              type="text"
              value={teamCodeInput}
              onChange={(event) => setTeamCodeInput(event.target.value.toUpperCase())}
              placeholder="코드"
              maxLength={12}
              disabled={pending}
            />
            <button type="submit" className="ghost-button planner-submit" disabled={pending}>
              팀 생성
            </button>
          </form>

          <div className="planner-account-list">
            {accountsForAssign.map((account) => (
              <div key={account.id} className="planner-account-row">
                <div className="planner-account-meta">
                  <strong>{account.name}</strong>
                  <span>{roleMeta[account.role]?.title ?? account.role}</span>
                </div>
                <select
                  className="planner-select"
                  value={account.teamId ?? ""}
                  onChange={(event) => onAssignTeam(account.id, event.target.value || null)}
                  disabled={pending || session.role !== "root"}
                >
                  <option value="">미배정</option>
                  {teamGraph.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {error ? <div className="login-error-text">{error}</div> : null}
        </div>

        <div className="planner-panel">
          <NodeGraphBoard
            teams={teamGraph.teams}
            accounts={teamGraph.accounts}
            canEdit={session.role === "root"}
            onMoveNode={onMoveNode}
          />
        </div>
      </div>
    </section>
  );
}

function NodeGraphBoard({ teams, accounts, canEdit, onMoveNode }) {
  const boardRef = useRef(null);
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const edges = accounts
    .filter((account) => account.teamId && teamById.has(account.teamId))
    .map((account) => {
      const team = teamById.get(account.teamId);
      return {
        key: `${team.id}-${account.id}`,
        x1: team.node.x + 60,
        y1: team.node.y + 26,
        x2: account.node.x + 60,
        y2: account.node.y + 26
      };
    });

  function handleDrop(event) {
    if (!canEdit) {
      return;
    }

    event.preventDefault();
    const payload = event.dataTransfer.getData("application/json");

    if (!payload || !boardRef.current) {
      return;
    }

    let data = null;

    try {
      data = JSON.parse(payload);
    } catch (_error) {
      return;
    }

    if (!data?.nodeType || !data?.nodeId) {
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left - 60, 24, 940);
    const y = clamp(event.clientY - rect.top - 26, 24, 520);

    onMoveNode(data.nodeType, data.nodeId, Math.round(x), Math.round(y));
  }

  return (
    <div className="graph-board">
      <div
        ref={boardRef}
        className="graph-canvas"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <svg className="graph-edges" aria-hidden="true">
          {edges.map((edge) => (
            <line
              key={edge.key}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              className="graph-edge-line"
            />
          ))}
        </svg>

        {teams.map((team) => (
          <div
            key={team.id}
            className="graph-node graph-node-team"
            style={{ left: `${team.node.x}px`, top: `${team.node.y}px` }}
            draggable={canEdit}
            onDragStart={(event) =>
              event.dataTransfer.setData(
                "application/json",
                JSON.stringify({ nodeType: "team", nodeId: team.id })
              )
            }
            title={`${team.name} (${team.code})`}
          >
            <small lang="en">{team.code}</small>
            <strong>{team.name}</strong>
          </div>
        ))}

        {accounts.map((account) => (
          <div
            key={account.id}
            className={`graph-node graph-node-account role-${account.role}`}
            style={{ left: `${account.node.x}px`, top: `${account.node.y}px` }}
            draggable={canEdit}
            onDragStart={(event) =>
              event.dataTransfer.setData(
                "application/json",
                JSON.stringify({ nodeType: "account", nodeId: account.id })
              )
            }
            title={`${account.name} / ${roleMeta[account.role]?.title ?? account.role}`}
          >
            <small>{account.badge}</small>
            <strong>{account.name}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function MapTopologyGraph({ domainName, projects, selectedProjectId, links, onSelectProject }) {
  const width = 100;
  const height = 100;
  const rootNode = { x: 50, y: 16 };
  const projectNodes = projects.map((project, index) => {
    const ratio = projects.length === 1 ? 0.5 : index / (projects.length - 1);

    return {
      ...project,
      x: 14 + ratio * 72,
      y: 78
    };
  });
  const nodeMap = new Map(projectNodes.map((node) => [node.id, node]));

  return (
    <div className="map-topology-shell">
      <svg className="map-topology-canvas" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {projectNodes.map((node) => (
          <line
            key={`root-${node.id}`}
            x1={rootNode.x}
            y1={rootNode.y + 8}
            x2={node.x}
            y2={node.y - 12}
            className="map-topology-line is-root"
          />
        ))}

        {links.map((link) => {
          const source = nodeMap.get(link.sourceProjectId);
          const target = nodeMap.get(link.targetProjectId);

          if (!source || !target) {
            return null;
          }

          return (
            <path
              key={link.id}
              d={`M ${source.x} ${source.y - 3} C ${source.x} 48, ${target.x} 48, ${target.x} ${target.y - 3}`}
              className="map-topology-line is-portal"
            />
          );
        })}
      </svg>

      <div className="map-topology-root" style={{ left: `${rootNode.x}%`, top: `${rootNode.y}%` }}>
        <span className="map-topology-node-badge">D</span>
        <strong>{domainName}</strong>
        <small>root domain</small>
      </div>

      {projectNodes.map((node) => (
        <button
          key={node.id}
          type="button"
          className={`map-topology-node ${node.id === selectedProjectId ? "is-selected" : ""}`}
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          onClick={() => onSelectProject(node.id)}
        >
          <span className="map-topology-node-badge">{node.label}</span>
          <strong>{node.folderName}</strong>
          <small>{node.portalLinks?.length ?? 0} portal</small>
        </button>
      ))}
    </div>
  );
}


function SummaryCard({ label, value }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function RoleGuideIcon({ role }) {
  const iconPath = {
    root: "M12 2.5 4 5.7v5.5c0 5.1 3.5 9.8 8 11.3 4.5-1.5 8-6.2 8-11.3V5.7L12 2.5Z",
    operator:
      "M7.8 2.8h8.4L18 6v4.2l-2.6 2.2v2.2L12 21l-3.4-6.4v-2.2L6 10.2V6l1.8-3.2Zm1.8 3.1v2.8L12 10.2l2.4-1.5V5.9H9.6Z",
    monitor:
      "M12 5c5.4 0 9.5 3.1 11 7-1.5 3.9-5.6 7-11 7S2.5 15.9 1 12c1.5-3.9 5.6-7 11-7Zm0 2.6A4.4 4.4 0 1 0 12 16.4 4.4 4.4 0 0 0 12 7.6Z"
  };

  return (
    <span className="role-guide-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d={iconPath[role] ?? iconPath.monitor} />
      </svg>
    </span>
  );
}

export default App;
