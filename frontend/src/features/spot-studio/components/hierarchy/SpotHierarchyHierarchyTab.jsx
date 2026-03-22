import TreeRow from "../../../../components/TreeRow";
import { renderNodeIcon } from "./spotHierarchySidebarViewModel";

export default function SpotHierarchyHierarchyTab({
  effectiveSpot,
  hierarchyOpen,
  toggleHierarchySection,
  groupedEntries,
  visibleIndependentWaypoints,
  hierarchyResultCount,
  hierarchyGroupKeys,
  hierarchyWaypointKeys,
  isHierarchyItemSelected,
  handleHierarchyItemClick,
  handleSpotCanvasContextMenu,
  startInlineRename,
  editingItem,
  handleInlineEditorChange,
  handleInlineEditorCommit,
  handleInlineEditorCancel,
  toggleGroup,
  isGroupExpanded,
  getWaypointTreeLabel
}) {
  return (
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
                                startInlineRename(
                                  event,
                                  "waypoint",
                                  waypoint.id,
                                  waypoint.name ?? getWaypointTreeLabel(waypoint)
                                )
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
                  editorValue={editingItem?.type === "waypoint" && editingItem.id === waypoint.id ? editingItem.value : ""}
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
  );
}
