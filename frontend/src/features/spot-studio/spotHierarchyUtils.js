export function matchesHierarchyQuery(query, ...values) {
  if (!query) {
    return true;
  }

  return values.some((value) => String(value ?? "").toLowerCase().includes(query));
}

export function createConnectionEntry(
  edge,
  waypointById,
  waypointDisplayNameById,
  waypointGroupNameById,
  getEdgeDisplayName,
  activeGroupId
) {
  const fromWaypoint = waypointById.get(edge.from) ?? null;
  const toWaypoint = waypointById.get(edge.to) ?? null;
  const fromGroupId = fromWaypoint?.groupId ?? null;
  const toGroupId = toWaypoint?.groupId ?? null;
  const fromLabel = waypointDisplayNameById.get(edge.from) ?? edge.from;
  const toLabel = waypointDisplayNameById.get(edge.to) ?? edge.to;
  const edgeLabel = getEdgeDisplayName(edge);
  const fromGroupLabel = waypointGroupNameById.get(fromGroupId) ?? "Ungrouped";
  const toGroupLabel = waypointGroupNameById.get(toGroupId) ?? "Ungrouped";
  const directionCode = edge.direction === "unidirectional" ? "UNI" : "BI";
  const directionIcon = edge.direction === "unidirectional" ? "->" : "<->";
  const directionLabel = edge.direction === "unidirectional" ? "Unidirectional" : "Bidirectional";

  if (activeGroupId) {
    const isInternal = fromGroupId === activeGroupId && toGroupId === activeGroupId;
    const isExternal = !isInternal && (fromGroupId === activeGroupId || toGroupId === activeGroupId);
    const relation = isInternal ? "internal" : isExternal ? "external" : "other";
    const relationLabel = isInternal ? "Internal" : isExternal ? "External" : "Other";

    return {
      edge,
      id: edge.id,
      label: edgeLabel,
      relation,
      relationLabel,
      directionCode,
      directionIcon,
      searchValues: [
        edgeLabel,
        fromLabel,
        toLabel,
        relationLabel,
        fromGroupLabel,
        toGroupLabel,
        directionCode,
        directionLabel
      ]
    };
  }

  const isIndependent = !fromGroupId && !toGroupId;
  const isWithinGroup = Boolean(fromGroupId) && fromGroupId === toGroupId;
  const relation = isIndependent ? "independent" : isWithinGroup ? "within" : "cross";
  const relationLabel = isIndependent
    ? "Independent"
    : isWithinGroup
      ? `Within ${waypointGroupNameById.get(fromGroupId) ?? "Group"}`
      : "Cross-group";

  return {
    edge,
    id: edge.id,
    label: `${edgeLabel} · ${relationLabel}`,
    relation,
    relationLabel,
    directionCode,
    directionIcon,
    searchValues: [edgeLabel, fromLabel, toLabel, relationLabel, fromGroupLabel, toGroupLabel, directionCode, directionLabel]
  };
}
