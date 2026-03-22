import { useEffect, useRef } from "react";
import { deckMeterToPixel, resolveMapImageSrc, toPercent } from "../../utils/mapCanvasViewport";
import { isDeckStudioSpotPlaced } from "../../../deck-studio/model/deckStudioDraftModel";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampDeckRectPosition(item, imageWidth, imageHeight, nextX, nextY) {
  const maxX = Math.max(0, imageWidth - Number(item?.width ?? 0));
  const maxY = Math.max(0, imageHeight - Number(item?.height ?? 0));

  return {
    x: Math.round(clamp(nextX, 0, maxX)),
    y: Math.round(clamp(nextY, 0, maxY))
  };
}

function clampDeckPinPosition(imageWidth, imageHeight, nextX, nextY) {
  return {
    x: Math.round(clamp(nextX, 0, imageWidth)),
    y: Math.round(clamp(nextY, 0, imageHeight))
  };
}

export default function MapCanvasWorld({
  showSpotEditorLayer,
  mapImageSrc,
  imageWidth,
  imageHeight,
  viewport,
  visibleSpotLayers,
  originX,
  originY,
  gridPlaneWidth,
  gridPlaneHeight,
  normalizedGridStepPx,
  gridLineColor,
  gridHighlightColor,
  gridRotationDeg,
  activeCalibration,
  showSpots,
  deck,
  availableSpotIds,
  selectedNode,
  onSelectSpot,
  onMoveSpot,
  showNoGo,
  onSelectNoGo,
  onMoveNoGo,
  showDocks,
  onSelectDock,
  onMoveDock,
  onCanvasContextMenu,
  robotItems,
  selectedRobotId,
  onSelectRobot,
  mapScope,
  marqueeRect,
  onWorldDragSuppressClick,
  editable = false
}) {
  const dragStateRef = useRef(null);

  useEffect(() => {
    function handleWindowPointerMove(event) {
      const dragState = dragStateRef.current;

      if (!dragState) {
        return;
      }

      const scale = Math.max(0.0001, Number(viewport?.scale ?? 1));
      const deltaX = (event.clientX - dragState.startClientX) / scale;
      const deltaY = (event.clientY - dragState.startClientY) / scale;

      if (!dragState.hasMoved && Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return;
      }

      dragState.hasMoved = true;

      if (dragState.itemType === "spot") {
        const nextPoint = clampDeckRectPosition(
          dragState.item,
          imageWidth,
          imageHeight,
          dragState.startX + deltaX,
          dragState.startY + deltaY
        );
        onMoveSpot?.(dragState.item.id, nextPoint);
        return;
      }

      if (dragState.itemType === "nogo") {
        const nextPoint = clampDeckRectPosition(
          dragState.item,
          imageWidth,
          imageHeight,
          dragState.startX + deltaX,
          dragState.startY + deltaY
        );
        onMoveNoGo?.(dragState.item.id, nextPoint);
        return;
      }

      const nextPoint = clampDeckPinPosition(
        imageWidth,
        imageHeight,
        dragState.startX + deltaX,
        dragState.startY + deltaY
      );
      onMoveDock?.(dragState.item.id, nextPoint);
    }

    function handleWindowPointerUp() {
      if (dragStateRef.current?.hasMoved) {
        onWorldDragSuppressClick?.();
      }

      dragStateRef.current = null;
    }

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [imageHeight, imageWidth, onMoveDock, onMoveNoGo, onMoveSpot, onWorldDragSuppressClick, viewport?.scale]);

  if (showSpotEditorLayer) {
    return null;
  }

  function handleDeckItemPointerDown(event, itemType, item, onSelect) {
    if (!editable) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelect?.(item);

    dragStateRef.current = {
      itemType,
      item,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: Number(item?.x ?? 0),
      startY: Number(item?.y ?? 0),
      hasMoved: false
    };
  }

  return (
    <div
      className="map-world"
      style={{
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`
      }}
    >
      <div
        className={`map-surface ${mapImageSrc ? "has-image" : "is-generated"}`}
        style={
          mapImageSrc
            ? {
                backgroundImage: `url(${mapImageSrc})`
              }
            : undefined
        }
      />

      {visibleSpotLayers.grid ? (
        <div
          className="map-grid-overlay"
          style={{
            left: toPercent(originX - gridPlaneWidth / 2, imageWidth),
            top: toPercent(originY - gridPlaneHeight / 2, imageHeight),
            width: toPercent(gridPlaneWidth, imageWidth),
            height: toPercent(gridPlaneHeight, imageHeight),
            backgroundSize: `${normalizedGridStepPx}px ${normalizedGridStepPx}px`,
            backgroundImage: `linear-gradient(90deg, ${gridLineColor} 1px, transparent 1px), linear-gradient(${gridLineColor} 1px, transparent 1px)`,
            borderColor: gridHighlightColor,
            transform: `rotate(${gridRotationDeg}deg)`
          }}
        />
      ) : null}

      {activeCalibration?.origin ? (
        <div
          className="map-origin-axes"
          style={{
            left: toPercent(originX, imageWidth),
            top: toPercent(originY, imageHeight),
            color: gridHighlightColor,
            transform: `translate(-50%, -50%) rotate(${gridRotationDeg}deg)`
          }}
        />
      ) : null}

      {showSpots
        ? deck.spots?.filter((spot) => isDeckStudioSpotPlaced(spot)).map((spot) => {
            const spotImageSrc = resolveMapImageSrc(spot.image);

            return (
              <div
                key={spot.id}
                className={`map-zone ${
                  availableSpotIds.includes(spot.id) ? "is-accessible" : "is-restricted"
                } ${
                  selectedNode?.type === "spot" && selectedNode.id === spot.id ? "is-selected" : ""
                } ${editable ? "is-draggable" : ""} ${spotImageSrc ? "has-preview" : ""}`}
                style={{
                  left: toPercent(spot.x, imageWidth),
                  top: toPercent(spot.y, imageHeight),
                  width: toPercent(spot.width, imageWidth),
                  height: toPercent(spot.height, imageHeight)
                }}
                onPointerDown={(event) => handleDeckItemPointerDown(event, "spot", spot, onSelectSpot)}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectSpot?.(spot);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCanvasContextMenu?.(event, {
                    type: "canvas-spot",
                    spotId: spot.id,
                    point: {
                      x: Number(spot.x ?? 0),
                      y: Number(spot.y ?? 0)
                    }
                  });
                }}
              >
                {spotImageSrc ? (
                  <div
                    className="map-zone-preview"
                    aria-hidden="true"
                    style={{
                      backgroundImage: `url(${spotImageSrc})`
                    }}
                  />
                ) : null}
                <span className="map-zone-label">{spot.name}</span>
              </div>
            );
          })
        : null}

      {showNoGo
        ? deck.noGoZones?.map((zone) => (
            <div
              key={zone.id}
              className={`map-hazard ${
                selectedNode?.type === "nogo" && selectedNode.id === zone.id ? "is-selected" : ""
              } ${editable ? "is-draggable" : ""}`}
              style={{
                left: toPercent(zone.x, imageWidth),
                top: toPercent(zone.y, imageHeight),
                width: toPercent(zone.width, imageWidth),
                height: toPercent(zone.height, imageHeight)
              }}
              onPointerDown={(event) => handleDeckItemPointerDown(event, "nogo", zone, onSelectNoGo)}
              onClick={(event) => {
                event.stopPropagation();
                onSelectNoGo?.(zone);
              }}
            >
              <span>{zone.name}</span>
            </div>
          ))
        : null}

      {showDocks
        ? [...(deck.docks ?? []), ...(deck.portals ?? [])].map((dock) => (
            <div
              key={dock.id}
              className={`map-pin ${dock.kind === "vertical" ? "is-portal" : ""} ${
                selectedNode?.type === "dock" && selectedNode.id === dock.id ? "is-selected" : ""
              } ${editable ? "is-draggable" : ""}`}
              style={{
                left: toPercent(dock.x, imageWidth),
                top: toPercent(dock.y, imageHeight)
              }}
              onPointerDown={(event) => handleDeckItemPointerDown(event, "dock", dock, onSelectDock)}
              onClick={(event) => {
                event.stopPropagation();
                onSelectDock?.(dock);
              }}
            >
              <span>{dock.name}</span>
            </div>
          ))
        : null}

      {robotItems.map((robot) => {
        const point = deckMeterToPixel(robot.mapPose, deck);

        if (!point) {
          return null;
        }

        return (
          <button
            key={robot.id}
            type="button"
            className={`map-robot ${selectedRobotId === robot.id ? "is-selected" : ""}`}
            style={{
              left: toPercent(point.x, imageWidth),
              top: toPercent(point.y, imageHeight),
              transform: `translate(-50%, -50%) rotate(${robot.mapPose?.heading ?? 0}deg)`
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelectRobot?.(robot);
            }}
          >
            <span className="map-robot-head" />
            <strong>{robot.badge ?? robot.name.slice(0, 1)}</strong>
            <small>{robot.name}</small>
          </button>
        );
      })}

      {mapScope.spot && activeCalibration?.origin ? (
        <div
          className="map-origin-marker"
          style={{
            left: toPercent(originX, imageWidth),
            top: toPercent(originY, imageHeight)
          }}
        />
      ) : null}

      {marqueeRect ? (
        <div
          className="map-marquee-selection"
          style={{
            left: toPercent(marqueeRect.x, imageWidth),
            top: toPercent(marqueeRect.y, imageHeight),
            width: toPercent(marqueeRect.width, imageWidth),
            height: toPercent(marqueeRect.height, imageHeight)
          }}
        />
      ) : null}
    </div>
  );
}
