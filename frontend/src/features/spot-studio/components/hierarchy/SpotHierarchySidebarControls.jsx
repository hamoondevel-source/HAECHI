import { BsPlus, BsSearch, BsThreeDotsVertical } from "react-icons/bs";
import {
  getSpotHierarchySearchAriaLabel,
  getSpotHierarchySearchPlaceholder
} from "./spotHierarchySidebarViewModel";

export default function SpotHierarchySidebarControls({
  canEdit,
  activeTab,
  searchValue,
  filterOptions,
  activeFilter,
  onChangeTab,
  onOpenCreateMenu,
  onSelectFilter,
  onSearchChange
}) {
  return (
    <>
      <div className="unity-hierarchy-titlebar">
        <div className="unity-hierarchy-tab-row">
          <button
            type="button"
            className={`unity-hierarchy-tab ${activeTab === "hierarchy" ? "is-active" : ""}`}
            onClick={() => onChangeTab("hierarchy")}
          >
            Hierarchy
          </button>
          <button
            type="button"
            className={`unity-hierarchy-tab ${activeTab === "connections" ? "is-active" : ""}`}
            onClick={() => onChangeTab("connections")}
          >
            Connections
          </button>
          <button
            type="button"
            className={`unity-hierarchy-tab ${activeTab === "areas" ? "is-active" : ""}`}
            onClick={() => onChangeTab("areas")}
          >
            Areas
          </button>
        </div>
        <button
          type="button"
          className="unity-hierarchy-title-action"
          onClick={onOpenCreateMenu}
          aria-label="하이어라키 메뉴"
          title="하이어라키 메뉴"
          disabled={!canEdit}
        >
          <BsThreeDotsVertical />
        </button>
      </div>

      <div className="unity-hierarchy-toolbar">
        <button
          type="button"
          className="unity-hierarchy-toolbutton"
          onClick={onOpenCreateMenu}
          aria-label="생성 메뉴"
          title="생성 메뉴"
          disabled={!canEdit}
        >
          <BsPlus />
        </button>

        <div className="unity-hierarchy-filter-group">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`unity-hierarchy-filter-pill ${activeFilter === option.id ? "is-active" : ""}`}
              onClick={() => onSelectFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="unity-hierarchy-search-row">
        <label className="unity-hierarchy-search">
          <BsSearch aria-hidden="true" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={getSpotHierarchySearchPlaceholder(activeTab)}
            aria-label={getSpotHierarchySearchAriaLabel(activeTab)}
          />
        </label>
      </div>
    </>
  );
}
