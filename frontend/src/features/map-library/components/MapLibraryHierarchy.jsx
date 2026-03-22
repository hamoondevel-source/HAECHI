import { BsCollectionFill, BsFolderFill, BsGeoAltFill } from "react-icons/bs";
import TreeRow from "../../../components/TreeRow";

function MapLibraryNodeIcon({ kind = "domain" }) {
  if (kind === "root" || kind === "domain") {
    return <BsFolderFill className="mac-folder-icon size-sm" aria-hidden="true" />;
  }

  if (kind === "deck") {
    return <BsCollectionFill className="hierarchy-glyph size-sm kind-deck" aria-hidden="true" />;
  }

  return <BsGeoAltFill className="hierarchy-glyph size-sm kind-spot" aria-hidden="true" />;
}

function MapLibraryTreeMeta({ detail, badgeLabel, badgeClassName }) {
  return (
    <>
      {detail ? <span className="map-library-tree-meta-note">{detail}</span> : null}
      <span className={`folder-node-kind ${badgeClassName}`}>{badgeLabel}</span>
    </>
  );
}

function formatSpotSize(spot) {
  const width = Number.isFinite(spot?.width) ? spot.width : "-";
  const height = Number.isFinite(spot?.height) ? spot.height : "-";
  return `${width} x ${height}`;
}

function getDomainDecks(domain) {
  return domain?.decks ?? domain?.projects ?? [];
}

export default function MapLibraryHierarchy({
  domains,
  selection,
  query = "",
  searchScope = "domain",
  expandedDomains,
  expandedDecks,
  onToggleDomain,
  onToggleDeck,
  onSelectRoot,
  onSelectDomain,
  onSelectDeck,
  onSelectSpot,
  onContextMenu
}) {
  const domainList = domains ?? [];
  const normalizedQuery = query.trim().toLowerCase();
  const hasSearchQuery = normalizedQuery.length > 0;
  const matchesSearch = (value) => String(value ?? "").toLowerCase().includes(normalizedQuery);
  const filteredDomainList = domainList
    .map((domain) => {
      const decks = getDomainDecks(domain);
      const domainMatches = hasSearchQuery && searchScope === "domain" && matchesSearch(domain.name);
      const filteredDecks = decks
        .map((deck) => {
          const deckSpots = deck.spots ?? [];
          const deckLabel = deck.displayName ?? deck.folderName;
          const deckMatches = hasSearchQuery && searchScope === "deck" && matchesSearch(deckLabel);
          const filteredSpots = deckSpots.filter((spot) => {
            if (!hasSearchQuery || domainMatches || deckMatches) {
              return true;
            }

            return searchScope === "spot" && matchesSearch(spot.name);
          });

          return {
            ...deck,
            deckSpots: filteredSpots,
            isVisible: !hasSearchQuery || domainMatches || deckMatches || filteredSpots.length > 0
          };
        })
        .filter((deck) => deck.isVisible);

      return {
        ...domain,
        decks: filteredDecks,
        projects: filteredDecks,
        isVisible: !hasSearchQuery || domainMatches || filteredDecks.length > 0
      };
    })
    .filter((domain) => domain.isVisible);
  const hasDomains = filteredDomainList.length > 0;

  return (
    <aside className="folder-tree-panel map-library-tree-panel">
      <div className="map-library-tree-scroll">
        <TreeRow
          depth={0}
          label="Map Library"
          icon={<MapLibraryNodeIcon kind="root" />}
          selected={selection.explorerType === "root"}
          meta={
            <MapLibraryTreeMeta
              detail={`${domainList.length} domains`}
              badgeLabel="Library"
              badgeClassName="kind-root"
            />
          }
          onClick={onSelectRoot}
        />

        <div className="unity-tree-children">
          {hasDomains ? (
            filteredDomainList.map((domain) => {
              const decks = getDomainDecks(domain);
              const isDomainOpen =
                expandedDomains[domain.id] ??
                (selection.explorerType === "domain"
                  ? selection.explorerDomainId === domain.id
                  : selection.explorerType === "deck" || selection.explorerType === "spot"
                    ? selection.explorerDomainId === domain.id
                    : selection.activeDomainId === domain.id);
              const isDomainSelected =
                selection.explorerType === "domain" && selection.explorerDomainId === domain.id;
              const isDomainDescendantFocused =
                !isDomainSelected &&
                (selection.explorerType === "deck" || selection.explorerType === "spot") &&
                selection.explorerDomainId === domain.id;

              return (
                <div key={domain.id} className="unity-tree-children">
                  <TreeRow
                    depth={1}
                    label={domain.name}
                    icon={<MapLibraryNodeIcon kind="domain" />}
                    meta={
                      <MapLibraryTreeMeta
                        detail={`${decks.length} decks`}
                        badgeLabel="Domain"
                        badgeClassName="kind-domain"
                      />
                    }
                    selected={isDomainSelected}
                    descendantFocused={isDomainDescendantFocused}
                    collapsible={decks.length > 0}
                    isOpen={isDomainOpen}
                    onToggle={() => onToggleDomain(domain.id, !isDomainOpen)}
                    onClick={() => onSelectDomain(domain.id)}
                    onContextMenu={(event) =>
                      onContextMenu(event, {
                        type: "domain",
                        id: domain.id,
                        name: domain.name
                      })
                    }
                  />

                  {isDomainOpen ? (
                    <div className="unity-tree-children">
                      {decks.length ? (
                        decks.map((deck) => {
                          const deckSpots = deck.deckSpots ?? deck.spots ?? [];
                          const isDeckOpen =
                            expandedDecks[deck.id] ??
                            ((selection.explorerType === "deck" || selection.explorerType === "spot") &&
                              selection.explorerDeckId === deck.id);
                          const isDeckSelected =
                            selection.explorerType === "deck" && selection.explorerDeckId === deck.id;
                          const isDeckDescendantFocused =
                            !isDeckSelected &&
                            selection.explorerType === "spot" &&
                            selection.explorerDeckId === deck.id;

                          return (
                            <div key={deck.id} className="unity-tree-children">
                              <TreeRow
                                depth={2}
                                label={deck.displayName ?? deck.folderName}
                                icon={<MapLibraryNodeIcon kind="deck" />}
                                meta={
                                  <MapLibraryTreeMeta
                                    detail={`${deckSpots.length} spots`}
                                    badgeLabel="Deck"
                                    badgeClassName="kind-deck"
                                  />
                                }
                                selected={isDeckSelected}
                                descendantFocused={isDeckDescendantFocused}
                                collapsible={deckSpots.length > 0}
                                isOpen={isDeckOpen}
                                onToggle={() => onToggleDeck(deck.id, !isDeckOpen)}
                                onClick={() => onSelectDeck(domain.id, deck)}
                                onContextMenu={(event) =>
                                  onContextMenu(event, {
                                    type: "deck",
                                    id: deck.id,
                                    name: deck.displayName ?? deck.folderName,
                                    domainId: domain.id
                                  })
                                }
                              />

                              {isDeckOpen ? (
                                <div className="unity-tree-children">
                                  {deckSpots.length ? (
                                    deckSpots.map((spot) => {
                                      const isSpotSelected =
                                        selection.explorerType === "spot" &&
                                        selection.explorerDeckId === deck.id &&
                                        selection.explorerSpotId === spot.id;

                                      return (
                                        <TreeRow
                                          key={spot.id}
                                          depth={3}
                                          label={spot.name}
                                          icon={<MapLibraryNodeIcon kind="spot" />}
                                          meta={
                                            <MapLibraryTreeMeta
                                              detail={formatSpotSize(spot)}
                                              badgeLabel="Spot"
                                              badgeClassName="kind-spot"
                                            />
                                          }
                                          selected={isSpotSelected}
                                          onClick={() => onSelectSpot(domain.id, deck.id, spot.id)}
                                          onContextMenu={(event) =>
                                            onContextMenu(event, {
                                              type: "spot",
                                              id: spot.id,
                                              name: spot.name,
                                              deckId: deck.id,
                                              domainId: domain.id
                                            })
                                          }
                                        />
                                      );
                                    })
                                  ) : (
                                    <div className="unity-tree-empty">등록된 Spot 없음</div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <div className="unity-tree-empty">등록된 Deck 없음</div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="unity-tree-empty">등록된 Domain 없음</div>
          )}
        </div>
      </div>
    </aside>
  );
}
