import { useEffect, useState } from "react";
import { AREA_TYPE_OPTIONS } from "../../model/spotEditorModel";
import { createConnectionEntry, matchesHierarchyQuery } from "../../utils/spotHierarchyUtils";
import SpotHierarchyAreasTab from "./SpotHierarchyAreasTab";
import SpotHierarchyConnectionsTab from "./SpotHierarchyConnectionsTab";
import SpotHierarchySidebarControls from "./SpotHierarchySidebarControls";
import SpotHierarchyHierarchyTab from "./SpotHierarchyHierarchyTab";
import SpotHierarchyStatus from "./SpotHierarchyStatus";
import { getSpotHierarchyFilterOptions } from "./spotHierarchySidebarViewModel";

export default function SpotHierarchySidebar({
  canEdit = true,
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
  const areaTypeMetaById = new Map(areaTypeOptions.map((option) => [option.id, option]));
  const getWaypointTreeLabel = (waypoint) => waypointDisplayNameById.get(waypoint.id) ?? waypoint.name ?? waypoint.id;

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
    groupedEntries.length +
    groupedEntries.reduce((sum, group) => sum + group.visibleWaypoints.length, 0) +
    visibleIndependentWaypoints.length;

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
      }

      return true;
    });

  const visibleAreas = allAreas.filter((area) => {
    const areaTypeMeta = areaTypeMetaById.get(area.kind) ?? areaTypeMetaById.get("custom") ?? AREA_TYPE_OPTIONS[0];
    const matchesFilter = areaFilter === "all" ? true : area.kind === areaFilter;

    return (
      matchesFilter &&
      matchesHierarchyQuery(
        areasQuery,
        area.name,
        areaTypeMeta?.label,
        areaTypeMeta?.shortLabel,
        `${Math.round(area.width)}x${Math.round(area.height)}`
      )
    );
  });

  function handleOpenCreateMenu(event) {
    if (!canEdit) {
      return;
    }

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

  function handleSearchChange(nextValue) {
    setSearchByTab((current) => ({
      ...current,
      [activeTab]: nextValue
    }));
  }

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
    if (!canEdit) {
      return;
    }

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

  const filterOptions = getSpotHierarchyFilterOptions(activeTab, activeGroupId);
  const activeFilter = activeTab === "hierarchy" ? hierarchyFilter : activeTab === "connections" ? connectionFilter : areaFilter;

  return (
    <div className="studio-hierarchy-stack">
      <section
        className="studio-hierarchy-panel"
        onContextMenu={(event) => handleSpotCanvasContextMenu(event, { type: "hierarchy", tab: activeTab })}
      >
        <div className="unity-hierarchy-window">
          <SpotHierarchySidebarControls
            canEdit={canEdit}
            activeTab={activeTab}
            searchValue={searchByTab[activeTab]}
            filterOptions={filterOptions}
            activeFilter={activeFilter}
            onChangeTab={setActiveTab}
            onOpenCreateMenu={handleOpenCreateMenu}
            onSelectFilter={handleSelectFilter}
            onSearchChange={handleSearchChange}
          />

          <div className="unity-hierarchy-scroll">
            {activeTab === "hierarchy" ? (
              <SpotHierarchyHierarchyTab
                effectiveSpot={effectiveSpot}
                hierarchyOpen={hierarchyOpen}
                toggleHierarchySection={toggleHierarchySection}
                groupedEntries={groupedEntries}
                visibleIndependentWaypoints={visibleIndependentWaypoints}
                hierarchyResultCount={hierarchyResultCount}
                hierarchyGroupKeys={hierarchyGroupKeys}
                hierarchyWaypointKeys={hierarchyWaypointKeys}
                isHierarchyItemSelected={isHierarchyItemSelected}
                handleHierarchyItemClick={handleHierarchyItemClick}
                handleSpotCanvasContextMenu={handleSpotCanvasContextMenu}
                startInlineRename={startInlineRename}
                editingItem={editingItem}
                handleInlineEditorChange={handleInlineEditorChange}
                handleInlineEditorCommit={handleInlineEditorCommit}
                handleInlineEditorCancel={handleInlineEditorCancel}
                toggleGroup={toggleGroup}
                isGroupExpanded={isGroupExpanded}
                getWaypointTreeLabel={getWaypointTreeLabel}
              />
            ) : activeTab === "connections" ? (
              <SpotHierarchyConnectionsTab
                connectionEntries={connectionEntries}
                activeGroupId={activeGroupId}
                connectionFilter={connectionFilter}
                hierarchyEdgeKeys={hierarchyEdgeKeys}
                isHierarchyItemSelected={isHierarchyItemSelected}
                handleHierarchyItemClick={handleHierarchyItemClick}
                handleSpotCanvasContextMenu={handleSpotCanvasContextMenu}
              />
            ) : (
              <SpotHierarchyAreasTab
                visibleAreas={visibleAreas}
                areaTypeMetaById={areaTypeMetaById}
                selectedAreaId={selectedAreaId}
                handleSelectArea={handleSelectArea}
                handleSpotCanvasContextMenu={handleSpotCanvasContextMenu}
                startInlineRename={startInlineRename}
                editingItem={editingItem}
                handleInlineEditorChange={handleInlineEditorChange}
                handleInlineEditorCommit={handleInlineEditorCommit}
                handleInlineEditorCancel={handleInlineEditorCancel}
              />
            )}
          </div>
        </div>
      </section>

      <SpotHierarchyStatus
        activeTab={activeTab}
        activeCanvasImage={activeCanvasImage}
        hierarchyResultCount={hierarchyResultCount}
        connectionCount={connectionEntries.length}
        areaCount={visibleAreas.length}
        activeGroupId={activeGroupId}
        activeGroupName={activeWaypointGroup?.name}
        message={message}
        error={error}
        hierarchySelectionKeys={hierarchySelectionKeys}
        selectedAreaId={selectedAreaId}
      />
    </div>
  );
}
