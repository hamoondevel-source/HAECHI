export function createDesktopStudioModalController({
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
}) {
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

  return {
    openSpotEditModal,
    openRenameWaypointModal,
    openRenameGroupModal,
    openRenameEdgeModal,
    openRenameAreaModal,
    openDeleteWaypointModal,
    openDeleteGroupModal,
    openDeleteEdgeModal,
    openDeleteAreaModal
  };
}

export default createDesktopStudioModalController;
