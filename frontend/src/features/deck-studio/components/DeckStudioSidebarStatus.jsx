function resolveSelectionSummary(selection, deckDraft, spots = []) {
  if (!selection?.type) {
    return "No Selection";
  }

  if (selection.type === "deck") {
    return `${deckDraft.label} ${deckDraft.name}`;
  }

  if (selection.type === "spot") {
    const selectedSpot = spots.find((spot) => spot.id === selection.id);
    return selectedSpot ? `Spot · ${selectedSpot.name}` : "Spot Selected";
  }

  return "Selection Active";
}

export default function DeckStudioSidebarStatus({
  deckDraft,
  selection,
  spots = [],
  spotsCount = 0,
  message = "",
  error = ""
}) {
  const imageWidth = deckDraft.image?.width ?? 0;
  const imageHeight = deckDraft.image?.height ?? 0;
  const selectionSummary = resolveSelectionSummary(selection, deckDraft, spots);
  const deckResolution = deckDraft.calibration?.resolution ?? 0.05;

  return (
    <section className="studio-hierarchy-notice-panel unity-hierarchy-status">
      <div className="studio-hierarchy-notice-head">
        <span className="studio-library-label">Status</span>
        <strong>{spotsCount} Spots</strong>
      </div>
      <p className="studio-hierarchy-notice-text">
        {imageWidth} px x {imageHeight} px
      </p>
      <p className="studio-hierarchy-notice-text">
        deck res. {deckResolution} · {spotsCount} spot results
      </p>
      <p className="studio-hierarchy-notice-text">
        좌측 Spot 결과를 드래그해 deck 캔버스 위에 배치하세요.
      </p>
      {message ? <p className="studio-hierarchy-notice-text">{message}</p> : null}
      {error ? <p className="studio-hierarchy-notice-text is-error">{error}</p> : null}
      <p className="studio-hierarchy-notice-text">{selectionSummary}</p>
    </section>
  );
}
