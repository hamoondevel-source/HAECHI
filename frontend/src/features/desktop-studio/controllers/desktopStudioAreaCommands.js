import {
  createClientId,
  getAreaTypeMeta,
  normalizeSpotArea
} from "../../spot-studio/model/spotEditorModel";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createDesktopStudioAreaCommands({
  effectiveSpot,
  activeCanvasImage,
  selectedAreaId,
  updateSpotEditor,
  setSelectedAreaId,
  setSelectedWaypointId,
  setSelectedEdgeId,
  setActiveWaypointGroupId,
  setEdgeAnchorWaypointId,
  setHierarchySelectionKeys,
  setHierarchyAnchorKey,
  setMessage,
  setError
}) {
  function handleAddArea(kind = "custom", position = null) {
    if (!effectiveSpot) {
      return;
    }

    const typeMeta = getAreaTypeMeta("custom");
    const canvasWidth = activeCanvasImage?.width ?? 1600;
    const canvasHeight = activeCanvasImage?.height ?? 900;
    const width = 184;
    const height = 116;
    const basePoint = position ?? {
      x: canvasWidth / 2,
      y: canvasHeight / 2
    };
    let nextAreaId = "";

    updateSpotEditor(effectiveSpot.id, (editorState) => {
      const nextIndex = editorState.zones.length + 1;
      nextAreaId = createClientId("area");

      return {
        ...editorState,
        zones: [
          ...editorState.zones,
          normalizeSpotArea(
            {
              id: nextAreaId,
              name: `구역 ${nextIndex}`,
              kind,
              x: clamp(Math.round(basePoint.x - width / 2), 0, Math.max(0, canvasWidth - width)),
              y: clamp(Math.round(basePoint.y - height / 2), 0, Math.max(0, canvasHeight - height)),
              width,
              height,
              color: typeMeta.color,
              opacity: typeMeta.opacity
            },
            nextIndex - 1
          )
        ]
      };
    });

    if (nextAreaId) {
      setSelectedAreaId(nextAreaId);
      setSelectedWaypointId("");
      setSelectedEdgeId("");
      setActiveWaypointGroupId("");
      setEdgeAnchorWaypointId("");
      setHierarchySelectionKeys([]);
      setHierarchyAnchorKey("");
      setMessage("구역을 추가했습니다.");
      setError("");
    }
  }

  function handleRenameArea(areaId, name) {
    if (!effectiveSpot || !areaId || !name?.trim()) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      zones: editorState.zones.map((area) =>
        area.id === areaId
          ? {
              ...area,
              name: name.trim()
            }
          : area
      )
    }));
    setError("");
  }

  function handleUpdateArea(areaId, patch) {
    if (!effectiveSpot || !areaId || !patch) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      zones: editorState.zones.map((area) => {
        if (area.id !== areaId) {
          return area;
        }

        const nextTypeMeta = getAreaTypeMeta("custom");
        const nextArea = {
          ...area,
          ...patch,
          kind: "custom"
        };

        if (patch.x !== undefined) {
          nextArea.x = Math.round(Number(patch.x || 0));
        }

        if (patch.y !== undefined) {
          nextArea.y = Math.round(Number(patch.y || 0));
        }

        if (patch.width !== undefined) {
          nextArea.width = clamp(Number(patch.width || area.width), 48, 2400);
        }

        if (patch.height !== undefined) {
          nextArea.height = clamp(Number(patch.height || area.height), 48, 2400);
        }

        if (patch.opacity !== undefined) {
          nextArea.opacity = clamp(Number(patch.opacity || nextTypeMeta.opacity), 0.08, 0.85);
        }

        return nextArea;
      })
    }));
    setError("");
  }

  function handleDeleteArea(areaId) {
    if (!effectiveSpot || !areaId) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      zones: editorState.zones.filter((area) => area.id !== areaId)
    }));

    if (selectedAreaId === areaId) {
      setSelectedAreaId("");
    }

    setMessage("구역을 삭제했습니다.");
    setError("");
  }

  function handleMoveArea(areaId, point) {
    if (!effectiveSpot || !areaId || !point) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      zones: editorState.zones.map((area) =>
        area.id === areaId
          ? {
              ...area,
              x: Math.round(point.x),
              y: Math.round(point.y)
            }
          : area
      )
    }));
  }

  function handleResizeArea(areaId, patch) {
    if (!effectiveSpot || !areaId || !patch) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      zones: editorState.zones.map((area) =>
        area.id === areaId
          ? {
              ...area,
              x: Math.round(Number(patch.x ?? area.x)),
              y: Math.round(Number(patch.y ?? area.y)),
              width: clamp(Number(patch.width ?? area.width), 48, 2400),
              height: clamp(Number(patch.height ?? area.height), 48, 2400)
            }
          : area
      )
    }));
  }

  return {
    handleAddArea,
    handleRenameArea,
    handleUpdateArea,
    handleDeleteArea,
    handleMoveArea,
    handleResizeArea
  };
}

export default createDesktopStudioAreaCommands;
