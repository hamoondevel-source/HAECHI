import ContextMenu from "../../../components/ContextMenu";
import { isDeckStudioSpotPlaced } from "../model/deckStudioDraftModel";

export default function DeckStudioContextMenu({
  canEdit = false,
  menu,
  deckDraft,
  selection,
  onClose,
  onAssignSpot,
  onUnassignSpot,
  onOpenSpotStudio
}) {
  if (!menu) {
    return null;
  }

  const payload = menu.payload ?? {};
  const selectedSpot =
    payload.spotId
      ? (deckDraft?.spots ?? []).find((spot) => spot.id === payload.spotId) ?? null
      : selection?.type === "spot"
        ? (deckDraft?.spots ?? []).find((spot) => spot.id === selection.id) ?? null
        : null;
  const isPlaced = isDeckStudioSpotPlaced(selectedSpot);
  const items = [];

  if (payload.type === "hierarchy-spot" && selectedSpot) {
    items.push(
      isPlaced
        ? {
            key: "unassign-hierarchy-spot",
            label: "현재 Deck에서 제외",
            disabled: !canEdit,
            onSelect: () => onUnassignSpot?.(selectedSpot.id)
          }
        : {
            key: "assign-hierarchy-spot",
            label: "현재 Deck에 배치",
            disabled: !canEdit,
            onSelect: () => onAssignSpot?.(selectedSpot.id, null)
          },
      {
        key: "open-spot-studio",
        label: "Spot Studio 열기",
        onSelect: () => onOpenSpotStudio?.(selectedSpot.id)
      }
    );
  }

  if (payload.type === "canvas" && selectedSpot && !isPlaced) {
    items.push({
      key: "assign-selected-spot-at-point",
      label: "선택 Spot 여기 배치",
      disabled: !canEdit,
      onSelect: () => onAssignSpot?.(selectedSpot.id, payload.point ?? null)
    });
  }

  if (payload.type === "canvas-spot" && selectedSpot) {
    items.push(
      {
        key: "open-canvas-spot-studio",
        label: "Spot Studio 열기",
        onSelect: () => onOpenSpotStudio?.(selectedSpot.id)
      },
      {
        key: "unassign-canvas-spot",
        label: "현재 Deck에서 제외",
        tone: "danger",
        disabled: !canEdit,
        onSelect: () => onUnassignSpot?.(selectedSpot.id)
      }
    );
  }

  return (
    <ContextMenu
      x={menu.x}
      y={menu.y}
      items={items}
      onClose={onClose}
      className="studio-context-menu is-spot-context-menu"
    />
  );
}
