import DetailItem from "../../../components/DetailItem";
import InspectorSection from "../../../components/InspectorSection";
import { SPOT_STUDIO_GRID_COLOR } from "../spotStudioColors";

export default function SpotStudioInspectorPanel({
  isSpotStudio,
  effectiveSpot,
  project,
  activeCanvasImage,
  effectiveSpotEditor,
  effectiveCalibration,
  onUpdateCalibration,
  spotsCount
}) {
  return (
    <aside className="studio-inspector-panel unity-spot-inspector">
      <div className="unity-studio-panel-titlebar">
        <span className="unity-studio-panel-title" lang="en">
          Inspector
        </span>
        <span className="meta-pill" lang="en">
          {isSpotStudio ? "SPOT" : effectiveSpot ? "SPOT" : "PROJECT"}
        </span>
      </div>

      <div className="unity-spot-inspector-body">
        <div className="unity-inspector-object-header">
          <p className="section-label" lang="en">
            Selection
          </p>
          <h2>{isSpotStudio ? effectiveSpot?.name ?? "Spot 선택" : effectiveSpot?.name ?? project.name}</h2>
        </div>

        {effectiveSpot ? (
          <>
            <InspectorSection title="Summary">
              <div className="detail-grid">
                {isSpotStudio ? (
                  <>
                    <DetailItem label="Spot" value={effectiveSpot.name} />
                    <DetailItem
                      label="Map Size"
                      value={`${activeCanvasImage?.width ?? 0}px x ${activeCanvasImage?.height ?? 0}px`}
                    />
                    <DetailItem label="Image" value={activeCanvasImage?.fileName ?? "No image"} />
                    <DetailItem label="Waypoints" value={effectiveSpotEditor.waypoints.length} />
                  </>
                ) : (
                  <>
                    <DetailItem label="Zone" value={effectiveSpot.zoneKey} />
                    <DetailItem label="Width" value={`${effectiveSpot.width}px`} />
                    <DetailItem label="Height" value={`${effectiveSpot.height}px`} />
                    <DetailItem label="Position" value={`${effectiveSpot.x}, ${effectiveSpot.y}`} />
                  </>
                )}
              </div>
            </InspectorSection>

            <InspectorSection title="Calibration">
              <div className="studio-two-column">
                <label className="inspector-field">
                  <span>Resolution (m/px)</span>
                  <input
                    className="inspector-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={effectiveCalibration?.resolution ?? 0.05}
                    onChange={(event) =>
                      onUpdateCalibration({
                        resolution: Number(event.target.value || 0.05)
                      })
                    }
                  />
                </label>
                <label className="inspector-field">
                  <span>Grid (m)</span>
                  <input
                    className="inspector-input"
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={effectiveCalibration?.gridMeters ?? 1}
                    onChange={(event) =>
                      onUpdateCalibration({
                        gridMeters: Number(event.target.value || 1)
                      })
                    }
                  />
                </label>
              </div>

              <div className="studio-two-column">
                <label className="inspector-field">
                  <span>Grid Color</span>
                  <input
                    className="inspector-input is-color"
                    type="color"
                    value={effectiveCalibration?.gridColor ?? SPOT_STUDIO_GRID_COLOR}
                    onChange={(event) =>
                      onUpdateCalibration({
                        gridColor: event.target.value
                      })
                    }
                  />
                </label>
                <label className="inspector-field">
                  <span>Grid Opacity</span>
                  <input
                    className="inspector-input"
                    type="number"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={effectiveCalibration?.gridOpacity ?? 0.26}
                    onChange={(event) =>
                      onUpdateCalibration({
                        gridOpacity: Number(event.target.value || 0.26)
                      })
                    }
                  />
                </label>
              </div>

              <label className="inspector-field">
                <span>Grid Count</span>
                <input
                  className="inspector-input"
                  type="number"
                  min="4"
                  max="120"
                  step="1"
                  value={effectiveCalibration?.gridCount ?? 20}
                  onChange={(event) =>
                    onUpdateCalibration({
                      gridCount: Number(event.target.value || 20)
                    })
                  }
                />
              </label>

              <label className="inspector-field">
                <span>Orientation (deg)</span>
                <input
                  className="inspector-input inspector-range"
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={effectiveCalibration?.rotation ?? 0}
                  onChange={(event) =>
                    onUpdateCalibration({
                      rotation: Number(event.target.value)
                    })
                  }
                />
              </label>
            </InspectorSection>

            <InspectorSection title="Origin">
              <div className="selection-strip inspector-origin-card">
                <strong>
                  x {Math.round(effectiveCalibration?.origin?.x ?? 0)} / y{" "}
                  {Math.round(effectiveCalibration?.origin?.y ?? 0)}
                </strong>
                <p>프리뷰를 클릭하면 선택된 Spot 원점이 저장됩니다.</p>
              </div>
            </InspectorSection>
          </>
        ) : (
          <>
            <InspectorSection title="Project">
              <div className="detail-grid">
                <DetailItem label="Domain" value={project.domainName} />
                <DetailItem label="Deck" value={`${project.label} ${project.name}`} />
                <DetailItem label="Image" value={project.image?.fileName ?? "No image"} />
                <DetailItem label="Spots" value={spotsCount} />
              </div>
            </InspectorSection>

            <InspectorSection title="Guide">
              <div className="selection-strip inspector-origin-card">
                <strong>Spot을 선택하면 원점과 해상도를 편집할 수 있습니다.</strong>
              </div>
            </InspectorSection>
          </>
        )}
      </div>
    </aside>
  );
}
