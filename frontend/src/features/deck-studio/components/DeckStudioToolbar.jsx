import { BsBoxArrowUpRight, BsCollectionFill } from "react-icons/bs";

const DECK_SCENE_VALUE = "__deck_scene__";

export default function DeckStudioToolbar({
  deckDraft,
  selection,
  spots = [],
  onSelectNode,
  onOpenSpotStudio
}) {
  const selectedSpotId = selection?.type === "spot" ? selection.id : "";
  const toolbarValue = selectedSpotId || DECK_SCENE_VALUE;

  function handleSelectionChange(nextValue) {
    if (nextValue === DECK_SCENE_VALUE) {
      onSelectNode?.({ type: "deck", id: deckDraft.deckId });
      return;
    }

    onSelectNode?.({ type: "spot", id: nextValue });
  }

  return (
    <div className="studio-browser-actions spot-toolbar-actions">
      <div className="spot-toolbar-cluster">
        <label className="spot-toolbar-select-shell">
          <BsCollectionFill className="spot-toolbar-icon" aria-hidden="true" />
          <select
            className="inspector-input spot-toolbar-select"
            value={toolbarValue}
            onChange={(event) => handleSelectionChange(event.target.value)}
          >
            <option value={DECK_SCENE_VALUE}>{`${deckDraft.label} ${deckDraft.name}`}</option>
            {spots.map((spot) => (
              <option key={spot.id} value={spot.id}>
                {spot.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="spot-toolbar-cluster spot-toolbar-cluster-tools">
        <button
          type="button"
          className="ghost-button spot-toolbar-button"
          onClick={() => onOpenSpotStudio?.(selectedSpotId)}
          disabled={!selectedSpotId}
        >
          <BsBoxArrowUpRight className="spot-toolbar-icon" aria-hidden="true" />
          열기
        </button>
      </div>
    </div>
  );
}
