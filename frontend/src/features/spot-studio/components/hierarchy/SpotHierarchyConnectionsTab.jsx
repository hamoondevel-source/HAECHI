import TreeRow from "../../../../components/TreeRow";
import { renderNodeIcon } from "./spotHierarchySidebarViewModel";

export default function SpotHierarchyConnectionsTab({
  connectionEntries,
  activeGroupId,
  connectionFilter,
  hierarchyEdgeKeys,
  isHierarchyItemSelected,
  handleHierarchyItemClick,
  handleSpotCanvasContextMenu
}) {
  return (
    <div className="unity-tree-children">
      {connectionEntries.length ? (
        connectionEntries.map((entry) => (
          <TreeRow
            key={entry.id}
            depth={0}
            label={entry.label}
            meta={
              <span
                className={`unity-tree-direction-badge ${entry.directionCode === "UNI" ? "is-uni" : "is-bi"}`}
              >
                <span className="unity-tree-direction-icon">{entry.directionIcon}</span>
                <span>{entry.directionCode}</span>
              </span>
            }
            icon={renderNodeIcon("edge")}
            selected={isHierarchyItemSelected("edge", entry.id)}
            onClick={(event) => handleHierarchyItemClick(event, "edge", entry.id, hierarchyEdgeKeys)}
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
  );
}
