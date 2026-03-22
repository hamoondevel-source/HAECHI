export function toStudioDeckDocument(mapDocument, deckId) {
  const draft = mapDocument ?? null;
  const deck = draft?.decks?.find((item) => item.id === deckId) ?? null;

  if (!draft || !deck) {
    throw new Error("Studio에서 열 Deck 초안을 찾을 수 없습니다.");
  }

  return {
    domainId: draft.id,
    domainName: draft.name,
    deckId: deck.id,
    label: deck.label,
    name: deck.name,
    status: draft.status,
    version: draft.version,
    updatedAt: draft.updatedAt,
    elevation: deck.elevation ?? 0,
    image: deck.image ?? null,
    calibration: deck.calibration ?? null,
    spots: deck.spots ?? [],
    noGoZones: deck.noGoZones ?? [],
    docks: deck.docks ?? [],
    portals: deck.portals ?? [],
    allDecks: (draft.decks ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      name: item.name
    }))
  };
}

export function toStudioDeckDocumentFromDeckPayload(payload) {
  const domain = payload?.domain ?? null;
  const deck = payload?.deck ?? null;

  if (!domain || !deck) {
    throw new Error("Studio에서 열 Deck 초안을 찾을 수 없습니다.");
  }

  return {
    domainId: domain.id,
    domainName: domain.name,
    deckId: deck.id,
    label: deck.label,
    name: deck.name,
    status: domain.status,
    version: domain.version,
    updatedAt: domain.updatedAt,
    elevation: deck.elevation ?? 0,
    image: deck.image ?? null,
    calibration: deck.calibration ?? null,
    spots: deck.spots ?? [],
    noGoZones: deck.noGoZones ?? [],
    docks: deck.docks ?? [],
    portals: deck.portals ?? [],
    allDecks: payload?.availableDecks ?? []
  };
}

export function toStudioDeckSavePatch(deckDraft) {
  return {
    label: deckDraft?.label ?? "",
    name: deckDraft?.name ?? "",
    elevation: Number(deckDraft?.elevation ?? 0),
    image: deckDraft?.image ?? null,
    calibration: deckDraft?.calibration ?? null,
    spots: deckDraft?.spots ?? [],
    noGoZones: deckDraft?.noGoZones ?? [],
    docks: deckDraft?.docks ?? [],
    portals: deckDraft?.portals ?? []
  };
}
