import {
  toStudioDeckDocument,
  toStudioDeckDocumentFromDeckPayload,
  toStudioDeckSavePatch
} from "../model/studioDeckDocument";

async function parseJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
}

export async function loadStudioDeckDraft({ actorId, deckId }) {
  if (!actorId) {
    throw new Error("Studio 세션 정보가 필요합니다.");
  }

  if (!deckId) {
    throw new Error("deckId가 필요합니다.");
  }

  const payload = await parseJsonResponse(
    await fetch(`/api/maps/studio/decks/${encodeURIComponent(deckId)}?viewerId=${encodeURIComponent(actorId)}`),
    "맵 스튜디오 데이터를 불러오지 못했습니다."
  );

  return {
    canEdit: Boolean(payload?.canEdit),
    deckDraft: payload?.deck ? toStudioDeckDocumentFromDeckPayload(payload) : toStudioDeckDocument(payload?.draft, deckId)
  };
}

export async function saveStudioDeckDraft({ actorId, deckDraft }) {
  const deckId = deckDraft?.deckId ?? "";

  if (!actorId) {
    throw new Error("Studio 세션 정보가 필요합니다.");
  }

  if (!deckId || !deckDraft) {
    throw new Error("저장할 Deck 초안이 없습니다.");
  }

  const payload = await parseJsonResponse(
    await fetch(`/api/maps/studio/decks/${encodeURIComponent(deckId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        actorId,
        patch: toStudioDeckSavePatch(deckDraft)
      })
    }),
    "맵 스튜디오 초안을 저장하지 못했습니다."
  );

  return {
    deckDraft: payload?.deck ? toStudioDeckDocumentFromDeckPayload(payload) : toStudioDeckDocument(payload?.draft, deckId),
    message: payload?.message ?? "맵 스튜디오 초안을 저장했습니다."
  };
}

export async function saveStudioDeckImage({ actorId, deckId, spotId = "", pickedFile }) {
  if (!actorId) {
    throw new Error("Studio 세션 정보가 필요합니다.");
  }

  if (!deckId) {
    throw new Error("deckId가 필요합니다.");
  }

  if (!pickedFile?.dataUrl) {
    throw new Error("저장할 이미지 데이터가 없습니다.");
  }

  const payload = await parseJsonResponse(
    await fetch(`/api/maps/studio/decks/${encodeURIComponent(deckId)}/image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        actorId,
        deckId,
        spotId,
        fileName: pickedFile.fileName ?? "map-image.png",
        width: pickedFile.width,
        height: pickedFile.height,
        dataUrl: pickedFile.dataUrl
      })
    }),
    "이미지를 저장하지 못했습니다."
  );

  return {
    deckDraft: payload?.deck ? toStudioDeckDocumentFromDeckPayload(payload) : toStudioDeckDocument(payload?.draft, deckId),
    message: payload?.message ?? "이미지를 저장했습니다."
  };
}

export async function createStudioDeckItem({ actorId, deckId, kind }) {
  if (!actorId) {
    throw new Error("Studio 세션 정보가 필요합니다.");
  }

  if (!deckId) {
    throw new Error("deckId가 필요합니다.");
  }

  const requestMap = {
    spot: {
      path: `/api/maps/studio/decks/${encodeURIComponent(deckId)}/spots`,
      body: { actorId },
      itemType: "spot",
      itemKey: "spot",
      fallbackMessage: "Spot을 추가하지 못했습니다."
    },
    nogo: {
      path: `/api/maps/studio/decks/${encodeURIComponent(deckId)}/nogo-zones`,
      body: { actorId },
      itemType: "nogo",
      itemKey: "zone",
      fallbackMessage: "금지 구역을 추가하지 못했습니다."
    },
    dock: {
      path: `/api/maps/studio/decks/${encodeURIComponent(deckId)}/docks`,
      body: { actorId, dock: { kind: "dock" } },
      itemType: "dock",
      itemKey: "dock",
      fallbackMessage: "Dock을 추가하지 못했습니다."
    },
    portal: {
      path: `/api/maps/studio/decks/${encodeURIComponent(deckId)}/docks`,
      body: { actorId, dock: { kind: "vertical" } },
      itemType: "dock",
      itemKey: "dock",
      fallbackMessage: "Portal을 추가하지 못했습니다."
    }
  };
  const request = requestMap[kind];

  if (!request) {
    throw new Error("지원하지 않는 Deck Studio 항목입니다.");
  }

  const payload = await parseJsonResponse(
    await fetch(request.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request.body)
    }),
    request.fallbackMessage
  );

  return {
    deckDraft: payload?.deck ? toStudioDeckDocumentFromDeckPayload(payload) : toStudioDeckDocument(payload?.draft, deckId),
    message: payload?.message ?? "Deck 항목을 추가했습니다.",
    itemType: request.itemType,
    item: payload?.[request.itemKey] ?? null
  };
}

export async function deleteStudioDeckItem({ actorId, deckId, itemType, itemId, dockKind = "dock" }) {
  if (!actorId) {
    throw new Error("Studio 세션 정보가 필요합니다.");
  }

  if (!deckId || !itemId) {
    throw new Error("삭제할 Deck Studio 항목이 없습니다.");
  }

  const requestMap = {
    spot: {
      path: `/api/maps/studio/decks/${encodeURIComponent(deckId)}/spots/${encodeURIComponent(itemId)}`,
      body: { actorId },
      fallbackMessage: "Spot을 삭제하지 못했습니다."
    },
    nogo: {
      path: `/api/maps/studio/decks/${encodeURIComponent(deckId)}/nogo-zones/${encodeURIComponent(itemId)}`,
      body: { actorId },
      fallbackMessage: "금지 구역을 삭제하지 못했습니다."
    },
    dock: {
      path: `/api/maps/studio/decks/${encodeURIComponent(deckId)}/docks/${encodeURIComponent(itemId)}`,
      body: {
        actorId,
        kind: dockKind === "vertical" ? "vertical" : "dock"
      },
      fallbackMessage: "Dock/Portal을 삭제하지 못했습니다."
    }
  };
  const request = requestMap[itemType];

  if (!request) {
    throw new Error("지원하지 않는 Deck Studio 항목입니다.");
  }

  const payload = await parseJsonResponse(
    await fetch(request.path, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request.body)
    }),
    request.fallbackMessage
  );

  return {
    deckDraft: payload?.deck ? toStudioDeckDocumentFromDeckPayload(payload) : toStudioDeckDocument(payload?.draft, deckId),
    message: payload?.message ?? "Deck 항목을 삭제했습니다.",
    removedId: payload?.removedId ?? itemId
  };
}
