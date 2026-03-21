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

export default function MapLibraryHierarchy({
  domains,
  selection,
  query = "",
  searchScope = "domain",
  expandedDomains,
  expandedProjects,
  onToggleDomain,
  onToggleProject,
  onSelectRoot,
  onSelectDomain,
  onSelectProject,
  onSelectSpot,
  onContextMenu
}) {
  const domainList = domains ?? [];
  const normalizedQuery = query.trim().toLowerCase();
  const hasSearchQuery = normalizedQuery.length > 0;
  const matchesSearch = (value) => String(value ?? "").toLowerCase().includes(normalizedQuery);
  const filteredDomainList = domainList
    .map((domain) => {
      const projects = domain.projects ?? [];
      const domainMatches = hasSearchQuery && searchScope === "domain" && matchesSearch(domain.name);
      const filteredProjects = projects
        .map((project) => {
          const projectSpots = project.spots ?? [];
          const projectLabel = project.displayName ?? project.folderName;
          const projectMatches = hasSearchQuery && searchScope === "deck" && matchesSearch(projectLabel);
          const filteredSpots = projectSpots.filter((spot) => {
            if (!hasSearchQuery || domainMatches || projectMatches) {
              return true;
            }

            return searchScope === "spot" && matchesSearch(spot.name);
          });

          return {
            ...project,
            projectSpots: filteredSpots,
            isVisible: !hasSearchQuery || domainMatches || projectMatches || filteredSpots.length > 0
          };
        })
        .filter((project) => project.isVisible);

      return {
        ...domain,
        projects: filteredProjects,
        isVisible: !hasSearchQuery || domainMatches || filteredProjects.length > 0
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
              const projects = domain.projects ?? [];
              const isDomainOpen =
                expandedDomains[domain.id] ??
                (selection.explorerType === "domain"
                  ? selection.explorerDomainId === domain.id
                  : selection.explorerType === "project" || selection.explorerType === "spot"
                    ? selection.explorerDomainId === domain.id
                    : selection.activeDomainId === domain.id);
              const isDomainSelected =
                selection.explorerType === "domain" && selection.explorerDomainId === domain.id;
              const isDomainDescendantFocused =
                !isDomainSelected &&
                (selection.explorerType === "project" || selection.explorerType === "spot") &&
                selection.explorerDomainId === domain.id;

              return (
                <div key={domain.id} className="unity-tree-children">
                  <TreeRow
                    depth={1}
                    label={domain.name}
                    icon={<MapLibraryNodeIcon kind="domain" />}
                    meta={
                      <MapLibraryTreeMeta
                        detail={`${projects.length} decks`}
                        badgeLabel="Domain"
                        badgeClassName="kind-domain"
                      />
                    }
                    selected={isDomainSelected}
                    descendantFocused={isDomainDescendantFocused}
                    collapsible={projects.length > 0}
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
                      {projects.length ? (
                        projects.map((project) => {
                          const projectSpots = project.spots ?? [];
                          const isProjectOpen =
                            expandedProjects[project.id] ??
                            ((selection.explorerType === "project" || selection.explorerType === "spot") &&
                              selection.explorerProjectId === project.id);
                          const isProjectSelected =
                            selection.explorerType === "project" && selection.explorerProjectId === project.id;
                          const isProjectDescendantFocused =
                            !isProjectSelected &&
                            selection.explorerType === "spot" &&
                            selection.explorerProjectId === project.id;

                          return (
                            <div key={project.id} className="unity-tree-children">
                              <TreeRow
                                depth={2}
                                label={project.displayName ?? project.folderName}
                                icon={<MapLibraryNodeIcon kind="deck" />}
                                meta={
                                  <MapLibraryTreeMeta
                                    detail={`${projectSpots.length} spots`}
                                    badgeLabel="Deck"
                                    badgeClassName="kind-deck"
                                  />
                                }
                                selected={isProjectSelected}
                                descendantFocused={isProjectDescendantFocused}
                                collapsible={projectSpots.length > 0}
                                isOpen={isProjectOpen}
                                onToggle={() => onToggleProject(project.id, !isProjectOpen)}
                                onClick={() => onSelectProject(domain.id, project)}
                                onContextMenu={(event) =>
                                  onContextMenu(event, {
                                    type: "project",
                                    id: project.id,
                                    name: project.displayName ?? project.folderName,
                                    domainId: domain.id
                                  })
                                }
                              />

                              {isProjectOpen ? (
                                <div className="unity-tree-children">
                                  {projectSpots.length ? (
                                    projectSpots.map((spot) => {
                                      const isSpotSelected =
                                        selection.explorerType === "spot" &&
                                        selection.explorerProjectId === project.id &&
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
                                          onClick={() => onSelectSpot(domain.id, project.id, spot.id)}
                                          onContextMenu={(event) =>
                                            onContextMenu(event, {
                                              type: "spot",
                                              id: spot.id,
                                              name: spot.name,
                                              projectId: project.id,
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
