export function createDesktopStudioWorkspaceController({
  actorId,
  deckId,
  deckDraft,
  canEdit,
  isSpotStudio,
  effectiveSpot,
  spotToolMode,
  hierarchySelectionKeys,
  saveDocument,
  pickAndSaveImage,
  updateSpot,
  setPending,
  setError,
  setMessage,
  setDeckDraft,
  onPersistedDeckDraft,
  setSpotToolMode,
  setEdgeLinkMode,
  setEdgeAnchorWaypointId,
  setHierarchyOpen,
  setSpotCanvasMenu,
  setSpotLayerVisibility
}) {
  function handleReadOnlyError() {
    setMessage("");
    setError("읽기 전용 Studio입니다. ROOT 권한에서만 편집할 수 있습니다.");
  }

  function handleSpotCanvasContextMenu(event, payload = null) {
    if (!isSpotStudio) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!canEdit) {
      return;
    }

    if (spotToolMode === "edge") {
      setSpotCanvasMenu(null);
      return;
    }

    const selectedWaypointKeys = hierarchySelectionKeys.filter((key) => key.startsWith("waypoint:"));
    const selectedEdgeKeys = hierarchySelectionKeys.filter((key) => key.startsWith("edge:"));
    const hasBatchSelection = selectedWaypointKeys.length > 0 || selectedEdgeKeys.length > 0;
    const selectedWaypointIds = selectedWaypointKeys.map((key) => key.slice("waypoint:".length));
    const selectedEdgeIds = selectedEdgeKeys.map((key) => key.slice("edge:".length));
    const payloadType = payload?.type ?? "";
    const isSelectedWaypointContext =
      payloadType === "waypoint" && selectedWaypointIds.includes(payload?.waypointId ?? "");
    const isSelectedEdgeContext =
      payloadType === "edge" && selectedEdgeIds.includes(payload?.edgeId ?? "");
    const shouldOpenBatchMenu =
      hasBatchSelection &&
      (payloadType === "canvas" || (selectedWaypointIds.length > 1 && isSelectedWaypointContext) || isSelectedEdgeContext);

    const nextPayload = shouldOpenBatchMenu
      ? {
          ...payload,
          type: "batch-selection",
          selectedWaypointIds,
          selectedEdgeIds
        }
      : payload;

    setSpotCanvasMenu({
      x: event.clientX,
      y: event.clientY,
      payload: nextPayload
    });
  }

  function toggleHierarchySection(sectionKey) {
    setHierarchyOpen((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey]
    }));
  }

  function handleOriginPick(point) {
    if (!canEdit) {
      handleReadOnlyError();
      return;
    }

    if (!effectiveSpot) {
      setError("Spot을 선택한 뒤 원점을 지정하세요.");
      return;
    }

    if (!isSpotStudio || spotToolMode !== "origin") {
      return;
    }

    updateSpot(effectiveSpot.id, {
      calibration: {
        origin: {
          x: Math.round(point.x),
          y: Math.round(point.y)
        }
      }
    });
    setError("");
    setMessage(`${effectiveSpot.name} Spot 원점을 갱신했습니다.`);
    setSpotToolMode("navigate");
  }

  async function handleSave() {
    if (!canEdit) {
      handleReadOnlyError();
      return null;
    }

    try {
      setPending(true);
      setError("");
      const saved = await saveDocument({
        actorId,
        deckDraft
      });

      onPersistedDeckDraft?.(saved.deckDraft);
      if (!onPersistedDeckDraft) {
        setDeckDraft(saved.deckDraft);
      }
      setMessage(saved.message ?? "맵 스튜디오 초안을 저장했습니다.");
      return saved;
    } catch (saveError) {
      setError(saveError.message || "맵 초안을 저장하지 못했습니다.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function handlePickImage() {
    if (!canEdit) {
      handleReadOnlyError();
      return null;
    }

    try {
      setPending(true);
      setError("");
      const nextDeckDraft = await pickAndSaveImage({
        actorId,
        deckId: deckDraft?.deckId ?? deckId,
        spotId: isSpotStudio ? effectiveSpot?.id ?? "" : ""
      });

      if (nextDeckDraft) {
        onPersistedDeckDraft?.(nextDeckDraft.deckDraft);
        if (!onPersistedDeckDraft) {
          setDeckDraft(nextDeckDraft.deckDraft);
        }
        setMessage(
          nextDeckDraft.message ??
            (isSpotStudio && effectiveSpot
              ? `${effectiveSpot.name} Spot 이미지를 저장했습니다.`
              : "Deck 이미지를 저장했습니다.")
        );
      }
      return nextDeckDraft;
    } catch (pickError) {
      setError(pickError.message || "이미지를 저장하지 못했습니다.");
      return null;
    } finally {
      setPending(false);
    }
  }

  function handleToggleOriginToolMode() {
    if (!canEdit) {
      handleReadOnlyError();
      return;
    }

    setSpotToolMode((current) => (current === "origin" ? "navigate" : "origin"));
    setEdgeAnchorWaypointId("");
  }

  function handleStopEdgeToolMode() {
    setSpotToolMode("navigate");
    setEdgeAnchorWaypointId("");
  }

  function handleToggleEdgeToolMode() {
    if (!canEdit) {
      handleReadOnlyError();
      return;
    }

    setSpotToolMode((current) => (current === "edge" ? "navigate" : "edge"));
    setEdgeAnchorWaypointId("");
  }

  function handleChangeEdgeLinkMode(nextMode) {
    if (!canEdit) {
      handleReadOnlyError();
      return;
    }

    setEdgeLinkMode(nextMode);
    setEdgeAnchorWaypointId("");

    if (nextMode === "single") {
      setMessage("단일 연결 모드: 시작 웨이포인트 클릭 후 대상을 클릭하세요.");
      setError("");
      return;
    }

    if (nextMode === "hold") {
      setMessage("홀드 체인 모드: 우클릭을 누른 채 드래그 후 떼면 생성됩니다.");
      setError("");
    }
  }

  function handleToggleSpotLayerVisibility(layerId) {
    setSpotLayerVisibility((current) => ({
      ...current,
      [layerId]: current[layerId] === false
    }));
  }

  return {
    handleSpotCanvasContextMenu,
    toggleHierarchySection,
    handleOriginPick,
    handleSave,
    handlePickImage,
    handleToggleOriginToolMode,
    handleStopEdgeToolMode,
    handleToggleEdgeToolMode,
    handleChangeEdgeLinkMode,
    handleToggleSpotLayerVisibility
  };
}

export default createDesktopStudioWorkspaceController;
