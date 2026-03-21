import { useEffect, useState } from "react";
import { BsPlus, BsSearch, BsThreeDotsVertical } from "react-icons/bs";
import TreeRow from "../../../components/TreeRow";
import { AREA_TYPE_OPTIONS } from "../spotEditorModel";
import { createConnectionEntry, matchesHierarchyQuery } from "../spotHierarchyUtils";

function renderNodeIcon(kind) {
  return <span className={`unity-node-icon kind-${kind}`} aria-hidden="true" />;
}

export default function SpotHierarchySidebar({
  handleSpotCanvasContextMenu,
  effectiveSpot,
  activeCanvasImage,
  hierarchyOpen,
  toggleHierarchySection,
  effectiveSpotEditor,
  waypointGroupCounts,
  areaTypeOptions = AREA_TYPE_OPTIONS,
  selectedAreaId = "",
  isHierarchyItemSelected,
  handleHierarchyItemClick,
  handleSelectArea,
  hierarchyGroupKeys,
  hierarchyWaypointKeys,
  hierarchyEdgeKeys,
  activeWaypointGroup,
  waypointGroupNameById,
  getEdgeDisplayName,
  waypointDisplayNameById,
  hierarchySelectionKeys,
  handleRenameSpot,
  handleRenameGroup,
  handleRenameWaypoint,
  handleRenameArea,
  message,
  error
}) {
  const [activeTab, setActiveTab] = useState("hierarchy");
  const [searchByTab, setSearchByTab] = useState({
    hierarchy: "",
    connections: "",
    areas: ""
  });
  const [hierarchyFilter, setHierarchyFilter] = useState("all");
  const [connectionFilter, setConnectionFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const allWaypoints = effectiveSpotEditor.waypoints ?? [];
  const allEdges = effectiveSpotEditor.edges ?? [];
  const allAreas = effectiveSpotEditor.zones ?? [];
  const activeGroupId = activeWaypointGroup?.id ?? null;
  const hierarchyQuery = searchByTab.hierarchy.trim().toLowerCase();
  const connectionsQuery = searchByTab.connections.trim().toLowerCase();
  const areasQuery = searchByTab.areas.trim().toLowerCase();
  const waypointById = new Map(allWaypoints.map((waypoint) => [waypoint.id, waypoint]));
  const getWaypointTreeLabel = (waypoint) => waypointDisplayNameById.get(waypoint.id) ?? waypoint.name ?? waypoint.id;
  const areaTypeMetaById = new Map(areaTypeOptions.map((option) => [option.id, option]));

  useEffect(() => {
    if (!activeGroupId) {
      setConnectionFilter("all");
      return;
    }

    setConnectionFilter((current) =>
      ["all", "related", "internal", "external"].includes(current) ? current : "related"
    );
  }, [activeGroupId]);

  useEffect(() => {
    setEditingItem(null);
  }, [activeTab, effectiveSpot?.id]);

  const groupedEntries = waypointGroupCounts
    .map((group) => {
      const sourceWaypoints = allWaypoints.filter((waypoint) => waypoint.groupId === group.id);
      const groupMatches = matchesHierarchyQuery(hierarchyQuery, group.name);
      const visibleWaypoints =
        hierarchyQuery && !groupMatches
          ? sourceWaypoints.filter((waypoint) =>
              matchesHierarchyQuery(hierarchyQuery, getWaypointTreeLabel(waypoint))
            )
          : sourceWaypoints;

      return {
        ...group,
        visibleWaypoints,
        isVisible: !hierarchyQuery || groupMatches || visibleWaypoints.length > 0
      };
    })
    .filter((group) => {
      if (hierarchyFilter === "loose") {
        return false;
      }

      return group.isVisible;
    });

  const visibleIndependentWaypoints = allWaypoints
    .filter((waypoint) => !waypoint.groupId)
    .filter((waypoint) => matchesHierarchyQuery(hierarchyQuery, getWaypointTreeLabel(waypoint)))
    .filter(() => hierarchyFilter !== "groups");

  const hierarchyResultCount =
    groupedEntries.length + groupedEntries.reduce((sum, group) => sum + group.visibleWaypoints.length, 0) + visibleIndependentWaypoints.length;

  const connectionEntries = allEdges
    .map((edge) =>
      createConnectionEntry(
        edge,
        waypointById,
        waypointDisplayNameById,
        waypointGroupNameById,
        getEdgeDisplayName,
        activeGroupId
      )
    )
    .filter((entry) => {
      if (!matchesHierarchyQuery(connectionsQuery, ...entry.searchValues)) {
        return false;
      }

      if (activeGroupId) {
        if (connectionFilter === "related") {
          return entry.relation === "internal" || entry.relation === "external";
        }
        if (connectionFilter === "internal") {
          return entry.relation === "internal";
        }
        if (connectionFilter === "external") {
          return entry.relation === "external";
        }
        return true;
      }

      return true;
    });

  const visibleAreas = allAreas.filter((area) => {
    const typeMeta = areaTypeMetaById.get("custom") ?? AREA_TYPE_OPTIONS[0];
    const matchesFilter = areaFilter === "all" ? true : area.kind === areaFilter;

    return (
      matchesFilter &&
      matchesHierarchyQuery(
        areasQuery,
        area.name,
        typeMeta?.label,
        typeMeta?.shortLabel,
        `${Math.round(area.width)}x${Math.round(area.height)}`
      )
    );
  });

  function handleOpenCreateMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    handleSpotCanvasContextMenu(event, { type: "hierarchy", tab: activeTab });
  }

  function toggleGroup(groupId) {
    setExpandedGroups((current) => ({
      ...current,
      [groupId]: !(current[groupId] ?? true)
    }));
  }

  function isGroupExpanded(groupId) {
    if (hierarchyQuery) {
      return true;
    }

    return expandedGroups[groupId] ?? true;
  }

  function handleChangeTab(nextTab) {
    setActiveTab(nextTab);
  }

  function handleSearchChange(nextValue) {
    setSearchByTab((current) => ({
      ...current,
      [activeTab]: nextValue
    }));
  }

  const filterOptions =
    activeTab === "hierarchy"
      ? [
          { id: "all", label: "All" },
          { id: "groups", label: "Groups" },
          { id: "loose", label: "Loose" }
        ]
      : activeTab === "connections"
        ? [
            ...(activeGroupId
              ? [
                  { id: "all", label: "All" },
                  { id: "related", label: "Related" },
                  { id: "internal", label: "Internal" },
                  { id: "external", label: "External" }
                ]
              : [{ id: "all", label: "All" }])
          ]
        : [{ id: "all", label: "All" }];

  const activeFilter = activeTab === "hierarchy" ? hierarchyFilter : activeTab === "connections" ? connectionFilter : areaFilter;

  function handleSelectFilter(filterId) {
    if (activeTab === "hierarchy") {
      setHierarchyFilter(filterId);
      return;
    }

    if (activeTab === "areas") {
      setAreaFilter(filterId);
      return;
    }

    setConnectionFilter(filterId);
  }

  function startInlineRename(event, type, id, initialValue) {
    event.preventDefault();
    event.stopPropagation();
    setEditingItem({
      type,
      id,
      initialValue: String(initialValue ?? ""),
      value: String(initialValue ?? "")
    });
  }

  function handleInlineEditorChange(nextValue) {
    setEditingItem((current) => (current ? { ...current, value: nextValue } : current));
  }

  function handleInlineEditorCancel() {
    setEditingItem(null);
  }

  function handleInlineEditorCommit() {
    if (!editingItem) {
      return;
    }

    const normalizedValue = editingItem.value.trim();
    const originalValue = editingItem.initialValue.trim();
    setEditingItem(null);

    if (!normalizedValue || normalizedValue === originalValue) {
      return;
    }

    if (editingItem.type === "spot") {
      handleRenameSpot?.(normalizedValue);
      return;
    }

    if (editingItem.type === "group") {
      handleRenameGroup?.(editingItem.id, normalizedValue);
      return;
    }

    if (editingItem.type === "waypoint") {
      handleRenameWaypoint?.(editingItem.id, normalizedValue);
      return;
    }

    if (editingItem.type === "area") {
      handleRenameArea?.(editingItem.id, normalizedValue);
    }
  }

  return (
    <div className="studio-hierarchy-stack">
      <section
        className="studio-hierarchy-panel"
        onContextMenu={(event) => handleSpotCanvasContextMenu(event, { type: "hierarchy", tab: activeTab })}
      >
        <div className="unity-hierarchy-window">
          <div className="unity-hierarchy-titlebar">
            <div className="unity-hierarchy-tab-row">
              <button
                type="button"
                className={`unity-hierarchy-tab ${activeTab === "hierarchy" ? "is-active" : ""}`}
                onClick={() => handleChangeTab("hierarchy")}
              >
                Hierarchy
              </button>
              <button
                type="button"
                className={`unity-hierarchy-tab ${activeTab === "connections" ? "is-active" : ""}`}
                onClick={() => handleChangeTab("connections")}
              >
                Connections
              </button>
              <button
                type="button"
                className={`unity-hierarchy-tab ${activeTab === "areas" ? "is-active" : ""}`}
                onClick={() => handleChangeTab("areas")}
              >
                Areas
              </button>
            </div>
            <button
              type="button"
              className="unity-hierarchy-title-action"
              onClick={handleOpenCreateMenu}
              aria-label="하이어라키 메뉴"
              title="하이어라키 메뉴"
            >
              <BsThreeDotsVertical />
            </button>
          </div>

          <div className="unity-hierarchy-toolbar">
            <button
              type="button"
              className="unity-hierarchy-toolbutton"
              onClick={handleOpenCreateMenu}
              aria-label="생성 메뉴"
              title="생성 메뉴"
            >
              <BsPlus />
            </button>

            <div className="unity-hierarchy-filter-group">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`unity-hierarchy-filter-pill ${activeFilter === option.id ? "is-active" : ""}`}
                  onClick={() => handleSelectFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="unity-hierarchy-search-row">
            <label className="unity-hierarchy-search">
              <BsSearch aria-hidden="true" />
              <input
                type="text"
                value={searchByTab[activeTab]}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={
                  activeTab === "hierarchy"
                    ? "Search groups / waypoints"
                    : activeTab === "connections"
                      ? "Search connections"
                      : "Search areas"
                }
                aria-label={
                  activeTab === "hierarchy"
                    ? "하이어라키 검색"
                    : activeTab === "connections"
                      ? "커넥션 검색"
                      : "구역 검색"
                }
              />
            </label>
          </div>

          <div className="unity-hierarchy-scroll">
            {activeTab === "hierarchy" ? (
              <>
                <TreeRow
                  depth={0}
                  label={effectiveSpot?.name ?? "No Spot Selected"}
                  icon={renderNodeIcon("scene")}
                  collapsible
                  isOpen={hierarchyOpen.groups}
                  onToggle={() => toggleHierarchySection("groups")}
                  onClick={() => toggleHierarchySection("groups")}
                  onDoubleClick={(event) =>
                    effectiveSpot ? startInlineRename(event, "spot", effectiveSpot.id, effectiveSpot.name ?? "") : null
                  }
                  onContextMenu={(event) => handleSpotCanvasContextMenu(event, { type: "hierarchy" })}
                  isMuted={!effectiveSpot}
                  editing={editingItem?.type === "spot" && editingItem.id === effectiveSpot?.id}
                  editorValue={editingItem?.type === "spot" && editingItem.id === effectiveSpot?.id ? editingItem.value : ""}
                  editorAriaLabel="Spot 이름 편집"
                  onEditorChange={handleInlineEditorChange}
                  onEditorCommit={handleInlineEditorCommit}
                  onEditorCancel={handleInlineEditorCancel}
                />

                {hierarchyOpen.groups ? (
                  <div className="unity-tree-children">
                    {hierarchyResultCount ? (
                      <>
                        {groupedEntries.map((group) => {
                          const isOpen = isGroupExpanded(group.id);
                          const isGroupSelected = isHierarchyItemSelected("group", group.id);

                          return (
                            <div key={group.id}>
                              <TreeRow
                                depth={1}
                                label={`${group.name} (${group.visibleWaypoints.length})`}
                                icon={renderNodeIcon("group")}
                                selected={isGroupSelected}
                                collapsible
                                isOpen={isOpen}
                                onToggle={() => toggleGroup(group.id)}
                                onDoubleClick={(event) => startInlineRename(event, "group", group.id, group.name ?? "")}
                                onClick={(event) =>
                                  handleHierarchyItemClick(event, "group", group.id, hierarchyGroupKeys)
                                }
                                onContextMenu={(event) =>
                                  handleSpotCanvasContextMenu(event, { type: "group", groupId: group.id })
                                }
                                editing={editingItem?.type === "group" && editingItem.id === group.id}
                                editorValue={editingItem?.type === "group" && editingItem.id === group.id ? editingItem.value : ""}
                                editorAriaLabel={`${group.name} 그룹 이름 편집`}
                                onEditorChange={handleInlineEditorChange}
                                onEditorCommit={handleInlineEditorCommit}
                                onEditorCancel={handleInlineEditorCancel}
                              />

                              {isOpen ? (
                                <div className="unity-tree-children">
                                  {group.visibleWaypoints.length ? (
                                    group.visibleWaypoints.map((waypoint) => (
                                      <TreeRow
                                        key={waypoint.id}
                                        depth={2}
                                        label={getWaypointTreeLabel(waypoint)}
                                        icon={renderNodeIcon("waypoint")}
                                        selected={isHierarchyItemSelected("waypoint", waypoint.id)}
                                        descendantFocused={isGroupSelected}
                                        onDoubleClick={(event) =>
                                          startInlineRename(event, "waypoint", waypoint.id, waypoint.name ?? getWaypointTreeLabel(waypoint))
                                        }
                                        onClick={(event) =>
                                          handleHierarchyItemClick(
                                            event,
                                            "waypoint",
                                            waypoint.id,
                                            hierarchyWaypointKeys
                                          )
                                        }
                                        onContextMenu={(event) =>
                                          handleSpotCanvasContextMenu(event, {
                                            type: "waypoint",
                                            waypointId: waypoint.id
                                          })
                                        }
                                        editing={editingItem?.type === "waypoint" && editingItem.id === waypoint.id}
                                        editorValue={
                                          editingItem?.type === "waypoint" && editingItem.id === waypoint.id ? editingItem.value : ""
                                        }
                                        editorAriaLabel={`${getWaypointTreeLabel(waypoint)} 이름 편집`}
                                        onEditorChange={handleInlineEditorChange}
                                        onEditorCommit={handleInlineEditorCommit}
                                        onEditorCancel={handleInlineEditorCancel}
                                      />
                                    ))
                                  ) : (
                                    <div className="unity-tree-empty">No matching waypoints</div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}

                        {visibleIndependentWaypoints.map((waypoint) => (
                          <TreeRow
                            key={waypoint.id}
                            depth={1}
                            label={getWaypointTreeLabel(waypoint)}
                            icon={renderNodeIcon("waypoint")}
                            selected={isHierarchyItemSelected("waypoint", waypoint.id)}
                            onDoubleClick={(event) =>
                              startInlineRename(event, "waypoint", waypoint.id, waypoint.name ?? getWaypointTreeLabel(waypoint))
                            }
                            onClick={(event) =>
                              handleHierarchyItemClick(event, "waypoint", waypoint.id, hierarchyWaypointKeys)
                            }
                            onContextMenu={(event) =>
                              handleSpotCanvasContextMenu(event, {
                                type: "waypoint",
                                waypointId: waypoint.id
                              })
                            }
                            editing={editingItem?.type === "waypoint" && editingItem.id === waypoint.id}
                            editorValue={
                              editingItem?.type === "waypoint" && editingItem.id === waypoint.id ? editingItem.value : ""
                            }
                            editorAriaLabel={`${getWaypointTreeLabel(waypoint)} 이름 편집`}
                            onEditorChange={handleInlineEditorChange}
                            onEditorCommit={handleInlineEditorCommit}
                            onEditorCancel={handleInlineEditorCancel}
                          />
                        ))}
                      </>
                    ) : (
                      <div className="unity-tree-empty">No matching hierarchy items</div>
                    )}
                  </div>
                ) : null}
              </>
            ) : activeTab === "connections" ? (
              <div className="unity-tree-children">
                {connectionEntries.length ? (
                  connectionEntries.map((entry) => (
                    <TreeRow
                      key={entry.id}
                      depth={0}
                      label={entry.label}
                      meta={
                        <span
                          className={`unity-tree-direction-badge ${
                            entry.directionCode === "UNI" ? "is-uni" : "is-bi"
                          }`}
                        >
                          <span className="unity-tree-direction-icon">{entry.directionIcon}</span>
                          <span>{entry.directionCode}</span>
                        </span>
                      }
                      icon={renderNodeIcon("edge")}
                      selected={isHierarchyItemSelected("edge", entry.id)}
                      onClick={(event) =>
                        handleHierarchyItemClick(event, "edge", entry.id, hierarchyEdgeKeys)
                      }
                      onContextMenu={(event) =>
                        handleSpotCanvasContextMenu(event, { type: "edge", edgeId: entry.id })
                      }
                    />
                  ))
                ) : (
                  <div className="unity-tree-empty">
                    {activeGroupId && connectionFilter !== "all"
                      ? "No matching connections in this scope"
                      : "No matching connections"}
                  </div>
                )}
              </div>
            ) : (
              <div className="unity-tree-children">
                {visibleAreas.length ? (
                  visibleAreas.map((area) => {
                    const areaTypeMeta = areaTypeMetaById.get("custom") ?? AREA_TYPE_OPTIONS[0];

                    return (
                      <TreeRow
                        key={area.id}
                        depth={0}
                        label={area.name}
                        meta={<span className="unity-tree-area-badge">{areaTypeMeta.shortLabel}</span>}
                        icon={renderNodeIcon("area")}
                        selected={selectedAreaId === area.id}
                        onClick={() => handleSelectArea?.(area.id)}
                        onDoubleClick={(event) => startInlineRename(event, "area", area.id, area.name ?? "")}
                        onContextMenu={(event) =>
                          handleSpotCanvasContextMenu(event, {
                            type: "area",
                            areaId: area.id
                          })
                        }
                        editing={editingItem?.type === "area" && editingItem.id === area.id}
                        editorValue={editingItem?.type === "area" && editingItem.id === area.id ? editingItem.value : ""}
                        editorAriaLabel={`${area.name} 구역 이름 편집`}
                        onEditorChange={handleInlineEditorChange}
                        onEditorCommit={handleInlineEditorCommit}
                        onEditorCancel={handleInlineEditorCancel}
                      />
                    );
                  })
                ) : (
                  <div className="unity-tree-empty">No matching areas</div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="studio-hierarchy-notice-panel unity-hierarchy-status" >
        <div className="studio-hierarchy-notice-head">
          <span className="studio-library-label">Status</span>
          <strong>
            {activeTab === "hierarchy"
              ? `Hierarchy ${hierarchyResultCount}`
              : activeTab === "connections"
                ? `Connections ${connectionEntries.length}`
                : `Areas ${visibleAreas.length}`}
          </strong>
        </div>
        <p className="studio-hierarchy-notice-text">
          {activeCanvasImage?.width ?? 0}px x {activeCanvasImage?.height ?? 0}px
        </p>
        <p className="studio-hierarchy-notice-text">
          {activeTab === "hierarchy"
            ? "Search filters groups and waypoints in real time"
            : activeTab === "connections"
              ? activeGroupId
                ? `${activeWaypointGroup?.name ?? "Group"} 기준 연결 필터 적용 중`
                : "Select a group to inspect internal / external connections"
              : "사용자 정의 구역을 검색하고 선택합니다."}
        </p>
        {message ? <p className="studio-hierarchy-notice-text">{message}</p> : null}
        {error ? <p className="studio-hierarchy-notice-text is-error">{error}</p> : null}
        <p className="studio-hierarchy-notice-text">
          {hierarchySelectionKeys.length
            ? `${hierarchySelectionKeys.length} selected`
            : selectedAreaId
              ? "1 selected"
              : "No Selection"}
        </p>
      </section>
    </div>
  );
}
