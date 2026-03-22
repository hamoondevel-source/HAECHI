import TreeRow from "../../../../components/TreeRow";
import { AREA_TYPE_OPTIONS } from "../../model/spotEditorModel";
import { renderNodeIcon } from "./spotHierarchySidebarViewModel";

export default function SpotHierarchyAreasTab({
  visibleAreas,
  areaTypeMetaById,
  selectedAreaId,
  handleSelectArea,
  handleSpotCanvasContextMenu,
  startInlineRename,
  editingItem,
  handleInlineEditorChange,
  handleInlineEditorCommit,
  handleInlineEditorCancel
}) {
  return (
    <div className="unity-tree-children">
      {visibleAreas.length ? (
        visibleAreas.map((area) => {
          const areaTypeMeta = areaTypeMetaById.get(area.kind) ?? areaTypeMetaById.get("custom") ?? AREA_TYPE_OPTIONS[0];

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
  );
}
