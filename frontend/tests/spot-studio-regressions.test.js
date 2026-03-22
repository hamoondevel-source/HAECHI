import test from "node:test";
import assert from "node:assert/strict";
import { appendSpotEditorEdgeChain } from "../src/features/spot-studio/model/spotEditorModel.js";
import { resolveHierarchySelectionChange } from "../src/features/desktop-studio/controllers/desktopStudioSelectionHelpers.js";
import {
  buildDraggedWaypointUpdates,
  buildResizedAreaBounds
} from "../src/features/spot-studio/utils/mapCanvasInteractionMath.js";

test("edge hold chain creates every segment instead of only the last edge", () => {
  const editor = {
    waypointGroups: [],
    edges: [],
    zones: [],
    waypoints: [
      { id: "w1", name: "WP1", x: 10, y: 10, groupId: null },
      { id: "w2", name: "WP2", x: 20, y: 20, groupId: null },
      { id: "w3", name: "WP3", x: 30, y: 30, groupId: null },
      { id: "w4", name: "WP4", x: 40, y: 40, groupId: null }
    ]
  };

  const result = appendSpotEditorEdgeChain(editor, {
    waypointIds: ["w1", "w2", "w3", "w4"],
    direction: "bidirectional"
  });

  assert.equal(result.status, "added");
  assert.equal(result.addedCount, 3);
  assert.deepEqual(
    result.nextEditorState.edges.map((edge) => [edge.from, edge.to]),
    [
      ["w1", "w2"],
      ["w2", "w3"],
      ["w3", "w4"]
    ]
  );
});

test("hierarchy multi-select keeps existing selection when ctrl toggling a second waypoint", () => {
  const result = resolveHierarchySelectionChange({
    type: "waypoint",
    id: "w2",
    hierarchySelectionKeys: ["waypoint:w1"],
    hierarchyAnchorKey: "waypoint:w1",
    orderedKeys: ["waypoint:w1", "waypoint:w2", "waypoint:w3"],
    isToggle: true,
    isRange: false
  });

  assert.equal(result.nextAnchorKey, "waypoint:w2");
  assert.deepEqual(result.nextSelectionKeys, ["waypoint:w1", "waypoint:w2"]);
});

test("group drag moves every selected waypoint and clamps to image bounds", () => {
  const updates = buildDraggedWaypointUpdates({
    waypointIds: ["w1", "w2"],
    startPositions: new Map([
      ["w1", { x: 20, y: 30 }],
      ["w2", { x: 190, y: 195 }]
    ]),
    deltaX: 25,
    deltaY: 15,
    imageWidth: 200,
    imageHeight: 200
  });

  assert.deepEqual(updates, [
    { id: "w1", x: 45, y: 45 },
    { id: "w2", x: 200, y: 200 }
  ]);
});

test("area resize respects minimum size and image boundaries", () => {
  const result = buildResizedAreaBounds({
    areaId: "area-1",
    handle: "nw",
    startPoint: { x: 120, y: 120 },
    originArea: { x: 100, y: 100, width: 80, height: 80 },
    point: { x: 170, y: 170 },
    imageWidth: 400,
    imageHeight: 400
  });

  assert.equal(result.areaId, "area-1");
  assert.deepEqual(result.nextBounds, {
    x: 132,
    y: 132,
    width: 48,
    height: 48
  });
});
