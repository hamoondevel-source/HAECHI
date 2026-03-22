import createDesktopStudioAreaCommands from "./desktopStudioAreaCommands";
import createDesktopStudioEdgeMutationCommands from "./desktopStudioEdgeMutationCommands";
import createDesktopStudioGroupAppearanceCommands from "./desktopStudioGroupAppearanceCommands";
import createDesktopStudioWaypointCommands from "./desktopStudioWaypointCommands";

export function createDesktopStudioElementController(dependencies) {
  const waypointCommands = createDesktopStudioWaypointCommands(dependencies);
  const groupAppearanceCommands = createDesktopStudioGroupAppearanceCommands(dependencies);
  const areaCommands = createDesktopStudioAreaCommands(dependencies);
  const edgeMutationCommands = createDesktopStudioEdgeMutationCommands(dependencies);

  return {
    ...waypointCommands,
    ...groupAppearanceCommands,
    ...areaCommands,
    ...edgeMutationCommands
  };
}

export default createDesktopStudioElementController;
