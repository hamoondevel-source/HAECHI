import {
  getSpotHierarchyStatusHint,
  getSpotHierarchyStatusTitle
} from "./spotHierarchySidebarViewModel";

export default function SpotHierarchyStatus({
  activeTab,
  activeCanvasImage,
  hierarchyResultCount,
  connectionCount,
  areaCount,
  activeGroupId,
  activeGroupName,
  message,
  error,
  hierarchySelectionKeys,
  selectedAreaId
}) {
  return (
    <section className="studio-hierarchy-notice-panel unity-hierarchy-status">
      <div className="studio-hierarchy-notice-head">
        <span className="studio-library-label">Status</span>
        <strong>
          {getSpotHierarchyStatusTitle(activeTab, {
            hierarchyResultCount,
            connectionCount,
            areaCount
          })}
        </strong>
      </div>
      <p className="studio-hierarchy-notice-text">
        {activeCanvasImage?.width ?? 0}px x {activeCanvasImage?.height ?? 0}px
      </p>
      <p className="studio-hierarchy-notice-text">
        {getSpotHierarchyStatusHint(activeTab, activeGroupId, activeGroupName)}
      </p>
      {message ? <p className="studio-hierarchy-notice-text">{message}</p> : null}
      {error ? <p className="studio-hierarchy-notice-text is-error">{error}</p> : null}
      <p className="studio-hierarchy-notice-text">
        {hierarchySelectionKeys.length ? `${hierarchySelectionKeys.length} selected` : selectedAreaId ? "1 selected" : "No Selection"}
      </p>
    </section>
  );
}
