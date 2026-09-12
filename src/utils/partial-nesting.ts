/**
 * Pure helpers for reasoning about the partial nesting graph.
 *
 * `dependencies` maps a partial page id to the partial ids it contains. The
 * values may be direct edges or transitive closures (e.g. the denormalized
 * `partialBlocks` page column) — depth results are identical for both, since
 * a closure only adds shortcut edges and the longest chain always follows
 * the direct ones.
 *
 * Shared between the builder (add-time checks) and the server (AI
 * get_partial_blocks filtering), so both enforce the same rules.
 */

/**
 * Checks if adding targetPartialId to currentPartialId would create a circular dependency.
 * @param currentPartialId - The partial currently being edited
 * @param targetPartialId - The partial being added
 * @param dependencies - Map of partialId to array of partialIds it contains
 * @param visited - Set of already visited partials (for cycle detection)
 * @returns true if adding would create a cycle
 */
export function wouldCreateCycle(
  currentPartialId: string,
  targetPartialId: string,
  dependencies: Record<string, string[]>,
  visited = new Set<string>(),
): boolean {
  // Self-reference
  if (currentPartialId === targetPartialId) return true;

  // Already visited (cycle in graph)
  if (visited.has(targetPartialId)) return false;
  visited.add(targetPartialId);

  // Check if target contains current (directly or transitively)
  const targetDeps = dependencies[targetPartialId] || [];
  for (const dep of targetDeps) {
    if (dep === currentPartialId) return true;
    if (wouldCreateCycle(currentPartialId, dep, dependencies, visited)) return true;
  }

  return false;
}

/**
 * Calculates the maximum nesting depth of a partial's own subtree.
 * @param partialId - The partial to calculate depth for
 * @param dependencies - Map of partialId to array of partialIds it contains
 * @param visited - Set of already visited partials (for cycle protection)
 * @returns The depth of the partial (1 = no nested partials)
 */
export function getPartialDepth(
  partialId: string,
  dependencies: Record<string, string[]>,
  visited = new Set<string>(),
): number {
  if (visited.has(partialId)) return 0; // Cycle, don't count
  visited.add(partialId);

  const deps = dependencies[partialId] || [];
  if (deps.length === 0) return 1;

  return 1 + Math.max(...deps.map((d) => getPartialDepth(d, dependencies, new Set(visited))));
}

/**
 * Longest chain of partials sitting ABOVE a partial — how deep it is already
 * embedded below pages. 0 = not used inside any partial; 1 = used inside a
 * top-level partial; and so on. The complement of getPartialDepth: an add is
 * within the limit when usage depth + own chain length stays ≤ max depth.
 * @param partialId - The partial to calculate usage depth for
 * @param dependencies - Map of partialId to array of partialIds it contains
 * @param visited - Set of already visited partials (for cycle protection)
 */
export function getPartialUsageDepth(
  partialId: string,
  dependencies: Record<string, string[]>,
  visited = new Set<string>(),
): number {
  if (visited.has(partialId)) return 0; // Cycle, don't count
  visited.add(partialId);

  let maxDepth = 0;
  for (const [parentId, deps] of Object.entries(dependencies)) {
    if (parentId === partialId || !deps.includes(partialId)) continue;
    maxDepth = Math.max(maxDepth, 1 + getPartialUsageDepth(parentId, dependencies, new Set(visited)));
  }
  return maxDepth;
}
