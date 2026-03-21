import ContextMenu from "../../../components/ContextMenu";

export default function SpotStudioContextMenu({
  spotCanvasMenu,
  edgeAnchorWaypointId,
  areaTypeOptions = [],
  onClose,
  onAddWaypoint,
  onCreateArea,
  onSwitchEdgeMode,
  onClearEdgeAnchor,
  onExpandAllHierarchy,
  onCollapseAllHierarchy,
  onRenameWaypoint,
  onDeleteWaypoint,
  onRenameGroup,
  onDeleteGroup,
  onRenameArea,
  onDeleteArea,
  onSelectEdge,
  onRenameEdge,
  onDeleteEdge,
  onBulkCreateGroupAndAssign,
  onBulkUngroup,
  onBulkDelete
}) {
  if (!spotCanvasMenu) {
    return null;
  }

  const payload = spotCanvasMenu.payload ?? {};
  const selectedWaypointCount = Array.isArray(payload.selectedWaypointIds) ? payload.selectedWaypointIds.length : 0;
  const selectedEdgeCount = Array.isArray(payload.selectedEdgeIds) ? payload.selectedEdgeIds.length : 0;
  const selectedItemCount = selectedWaypointCount + selectedEdgeCount;
  const items = [];
  const defaultAreaType = areaTypeOptions.find((option) => option.id === "custom") ?? areaTypeOptions[0] ?? { id: "custom" };

  if (payload.type === "canvas") {
    items.push(
      {
        key: "add-waypoint",
        label: "웨이포인트 추가",
        onSelect: () => onAddWaypoint(payload.point ?? null)
      },
      {
        key: "add-area",
        label: `${defaultAreaType.label ?? "구역"} 추가`,
        onSelect: () => onCreateArea?.(defaultAreaType.id ?? "custom", payload.point ?? null)
      },
      {
        key: "edge-mode",
        label: "간선 모드",
        onSelect: () => onSwitchEdgeMode()
      }
    );

    if (edgeAnchorWaypointId) {
      items.push({
        key: "clear-anchor",
        label: "시작점 해제",
        onSelect: () => onClearEdgeAnchor()
      });
    }
  }

  if (payload.type === "hierarchy" && payload.tab !== "areas") {
    items.push(
      {
        key: "expand-all",
        label: "전체 펼치기",
        onSelect: () => onExpandAllHierarchy()
      },
      {
        key: "collapse-all",
        label: "전체 접기",
        onSelect: () => onCollapseAllHierarchy()
      }
    );
  }

  if (payload.type === "hierarchy" && payload.tab === "areas") {
    items.push({
      key: "add-area-from-hierarchy",
      label: `+ ${defaultAreaType.label ?? "구역"} 추가`,
      onSelect: () => onCreateArea?.(defaultAreaType.id ?? "custom")
    });
  }

  if (payload.type === "waypoint") {
    items.push(
      {
        key: "rename-waypoint",
        label: "이름 변경",
        onSelect: () => onRenameWaypoint(payload.waypointId)
      },
      {
        key: "delete-waypoint",
        label: "웨이포인트 삭제",
        tone: "danger",
        onSelect: () => onDeleteWaypoint(payload.waypointId)
      }
    );
  }

  if (payload.type === "group") {
    items.push(
      {
        key: "rename-group",
        label: "그룹 이름 변경",
        onSelect: () => onRenameGroup(payload.groupId)
      },
      {
        key: "delete-group",
        label: "그룹 삭제",
        tone: "danger",
        onSelect: () => onDeleteGroup(payload.groupId)
      }
    );
  }

  if (payload.type === "area") {
    items.push(
      {
        key: "rename-area",
        label: "구역 이름 변경",
        onSelect: () => onRenameArea?.(payload.areaId)
      },
      {
        key: "delete-area",
        label: "구역 삭제",
        tone: "danger",
        onSelect: () => onDeleteArea?.(payload.areaId)
      }
    );
  }

  if (payload.type === "edge") {
    items.push(
      {
        key: "select-edge",
        label: "간선 선택",
        onSelect: () => onSelectEdge(payload.edgeId)
      },
      {
        key: "rename-edge",
        label: "간선 이름 변경",
        onSelect: () => onRenameEdge(payload.edgeId)
      },
      {
        key: "delete-edge",
        label: "간선 삭제",
        tone: "danger",
        onSelect: () => onDeleteEdge(payload.edgeId)
      }
    );
  }

  if (payload.type === "batch-selection") {
    if (selectedItemCount >= 1) {
      items.push(
        {
          key: "bulk-group",
          label: "선택 그룹화",
          onSelect: () => onBulkCreateGroupAndAssign?.()
        },
        {
          key: "bulk-ungroup",
          label: "선택 그룹 해제",
          onSelect: () => onBulkUngroup?.()
        }
      );
    }

    items.push({
      key: "bulk-delete",
      label: "선택 삭제",
      tone: "danger",
      onSelect: () => onBulkDelete?.()
    });
  }

  return (
    <ContextMenu
      x={spotCanvasMenu.x}
      y={spotCanvasMenu.y}
      items={items}
      onClose={onClose}
      className="studio-context-menu is-spot-context-menu"
    />
  );
}
