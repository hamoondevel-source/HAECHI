export function createDesktopStudioEdgeMutationCommands({
  effectiveSpot,
  selectedEdge,
  selectedEdgeId,
  selectedEdgeIds,
  updateSpotEditor,
  setSelectedEdgeId,
  setMessage,
  setError
}) {
  function handleRenameEdge(edgeId, name) {
    if (!effectiveSpot || !edgeId || !name?.trim()) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      edges: editorState.edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              name: name.trim()
            }
          : edge
      )
    }));
    setError("");
  }

  function handleDeleteEdge(edgeId) {
    if (!effectiveSpot || !edgeId) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      edges: editorState.edges.filter((edge) => edge.id !== edgeId)
    }));

    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId("");
    }

    setMessage("간선을 삭제했습니다.");
    setError("");
  }

  function handleUpdateEdgeColor(edgeId, color) {
    if (!effectiveSpot || !edgeId || !color) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      edges: editorState.edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              color
            }
          : edge
      )
    }));
  }

  function handleUpdateSelectedEdgeDirection(direction) {
    if (!effectiveSpot || !selectedEdge) {
      return;
    }

    const normalizedDirection = direction === "unidirectional" ? "unidirectional" : "bidirectional";
    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      edges: editorState.edges.map((edge) =>
        edge.id === selectedEdge.id
          ? {
              ...edge,
              direction: normalizedDirection
            }
          : edge
      )
    }));
    setMessage("간선 방향을 변경했습니다.");
    setError("");
  }

  function handleBulkUpdateEdgeDirection(direction) {
    if (!effectiveSpot || !selectedEdgeIds.length) {
      return;
    }

    const normalizedDirection = direction === "unidirectional" ? "unidirectional" : "bidirectional";
    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      edges: editorState.edges.map((edge) =>
        selectedEdgeIds.includes(edge.id)
          ? {
              ...edge,
              direction: normalizedDirection
            }
          : edge
      )
    }));
    setMessage(`${selectedEdgeIds.length}개 간선 방향을 변경했습니다.`);
    setError("");
  }

  return {
    handleRenameEdge,
    handleDeleteEdge,
    handleUpdateEdgeColor,
    handleUpdateSelectedEdgeDirection,
    handleBulkUpdateEdgeDirection
  };
}

export default createDesktopStudioEdgeMutationCommands;
