import {
  appendSpotEditorEdge,
  appendSpotEditorEdgeChain
} from "../../spot-studio/model/spotEditorModel";

export function createDesktopStudioEdgeController({
  effectiveSpot,
  edgeDirectionMode,
  updateSpotEditor,
  setSpotToolMode,
  setEdgeLinkMode,
  setSelectedWaypointId,
  setSelectedEdgeId,
  setEdgeAnchorWaypointId,
  setMessage,
  setError
}) {
  function handleAddEdge(
    fromWaypointId = null,
    toWaypointId = null,
    direction = "bidirectional",
    options = {}
  ) {
    const { silent = false, selectCreatedEdge = true } = options;

    if (!effectiveSpot) {
      if (!silent) {
        setError("Spot을 먼저 선택하세요.");
      }
      return { status: "no-spot", edgeId: "" };
    }

    let edgeResult = {
      status: "added",
      edgeId: "",
      nextEditorState: null
    };

    updateSpotEditor(effectiveSpot.id, (editorState) => {
      edgeResult = appendSpotEditorEdge(editorState, {
        fromWaypointId,
        toWaypointId,
        direction
      });
      return edgeResult.nextEditorState;
    });

    if (edgeResult.status === "insufficient") {
      if (!silent) {
        setError("간선을 만들려면 웨이포인트가 2개 이상 필요합니다.");
      }
      return { status: "insufficient", edgeId: "" };
    }

    if (edgeResult.status === "invalid") {
      if (!silent) {
        setError("간선 시작점과 종료점을 확인하세요.");
      }
      return { status: "invalid", edgeId: "" };
    }

    if (edgeResult.status === "duplicated") {
      if (!silent) {
        setError("이미 같은 방향의 간선이 존재합니다.");
      }
      return { status: "duplicated", edgeId: "" };
    }

    if (edgeResult.edgeId && selectCreatedEdge) {
      setSelectedEdgeId(edgeResult.edgeId);
    }

    if (!silent) {
      setMessage("간선을 추가했습니다.");
      setError("");
    }

    return { status: "added", edgeId: edgeResult.edgeId };
  }

  function handleStartEdgeChain(waypointId) {
    if (!waypointId) {
      return;
    }

    setSpotToolMode("edge");
    setEdgeLinkMode("hold");
    setSelectedWaypointId(waypointId);
    setSelectedEdgeId("");
    setEdgeAnchorWaypointId(waypointId);
    setMessage("우클릭을 누른 채 이동하면 점선 프리뷰가 보이고, 버튼을 떼면 간선이 한 번에 생성됩니다.");
    setError("");
  }

  function handleEndEdgeChain(chainWaypointIds = []) {
    const path = Array.isArray(chainWaypointIds) ? chainWaypointIds : [];
    setEdgeAnchorWaypointId("");

    if (!effectiveSpot || path.length < 2) {
      return;
    }

    let chainResult = {
      addedCount: 0,
      duplicatedCount: 0,
      skippedCount: 0
    };

    updateSpotEditor(effectiveSpot.id, (editorState) => {
      chainResult = appendSpotEditorEdgeChain(editorState, {
        waypointIds: path,
        direction: edgeDirectionMode
      });
      return chainResult.nextEditorState;
    });

    setSelectedWaypointId(path[path.length - 1] ?? "");
    setSelectedEdgeId("");

    if (chainResult.addedCount > 0) {
      const suffixParts = [];

      if (chainResult.duplicatedCount > 0) {
        suffixParts.push(`중복 ${chainResult.duplicatedCount}`);
      }

      if (chainResult.skippedCount > 0) {
        suffixParts.push(`스킵 ${chainResult.skippedCount}`);
      }

      const suffix = suffixParts.length ? ` (${suffixParts.join(", ")})` : "";
      setMessage(`${chainResult.addedCount}개 간선을 생성했습니다${suffix}.`);
      setError("");
      return;
    }

    setMessage("새로 생성된 간선이 없습니다.");
    setError("");
  }

  return {
    handleAddEdge,
    handleStartEdgeChain,
    handleEndEdgeChain
  };
}

export default createDesktopStudioEdgeController;
