export function renderNodeIcon(kind) {
  return <span className={`unity-node-icon kind-${kind}`} aria-hidden="true" />;
}

export function getSpotHierarchyFilterOptions(activeTab, activeGroupId) {
  if (activeTab === "hierarchy") {
    return [
      { id: "all", label: "All" },
      { id: "groups", label: "Groups" },
      { id: "loose", label: "Loose" }
    ];
  }

  if (activeTab === "connections") {
    return activeGroupId
      ? [
          { id: "all", label: "All" },
          { id: "related", label: "Related" },
          { id: "internal", label: "Internal" },
          { id: "external", label: "External" }
        ]
      : [{ id: "all", label: "All" }];
  }

  return [{ id: "all", label: "All" }];
}

export function getSpotHierarchySearchPlaceholder(activeTab) {
  if (activeTab === "hierarchy") {
    return "Search groups / waypoints";
  }

  if (activeTab === "connections") {
    return "Search connections";
  }

  return "Search areas";
}

export function getSpotHierarchySearchAriaLabel(activeTab) {
  if (activeTab === "hierarchy") {
    return "하이어라키 검색";
  }

  if (activeTab === "connections") {
    return "커넥션 검색";
  }

  return "구역 검색";
}

export function getSpotHierarchyStatusTitle(activeTab, { hierarchyResultCount, connectionCount, areaCount }) {
  if (activeTab === "hierarchy") {
    return `Hierarchy ${hierarchyResultCount}`;
  }

  if (activeTab === "connections") {
    return `Connections ${connectionCount}`;
  }

  return `Areas ${areaCount}`;
}

export function getSpotHierarchyStatusHint(activeTab, activeGroupId, activeGroupName) {
  if (activeTab === "hierarchy") {
    return "Search filters groups and waypoints in real time";
  }

  if (activeTab === "connections") {
    return activeGroupId
      ? `${activeGroupName ?? "Group"} 기준 연결 필터 적용 중`
      : "Select a group to inspect internal / external connections";
  }

  return "사용자 정의 구역을 검색하고 선택합니다.";
}
