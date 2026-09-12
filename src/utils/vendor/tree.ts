/**
 * Minimal tree structure over nested `children` models. Internal replacement
 * for the `tree-model` npm package (MIT, https://github.com/joaonuno/tree-model-js),
 * keeping the subset of its API we use: parse, walk (pre-order), first, drop,
 * addChildAtIndex, and the node/model duality (node.children mirrors
 * node.model.children).
 */

export type TreeModelLike = { children?: TreeModelLike[] } & Record<string, any>;

export class TreeNode<T extends TreeModelLike> {
  model: T;
  parent: TreeNode<T> | null = null;
  children: TreeNode<T>[] = [];

  constructor(model: T) {
    this.model = model;
  }

  /** Pre-order traversal. Return false from the visitor to stop early. */
  walk(visitor: (node: TreeNode<T>) => boolean | void): void {
    const stack: TreeNode<T>[] = [this];
    while (stack.length) {
      const node = stack.shift() as TreeNode<T>;
      if (visitor(node) === false) return;
      stack.unshift(...node.children);
    }
  }

  /** First node (pre-order) matching the predicate. */
  first(predicate: (node: TreeNode<T>) => boolean): TreeNode<T> | undefined {
    let found: TreeNode<T> | undefined;
    this.walk((node) => {
      if (predicate(node)) {
        found = node;
        return false;
      }
    });
    return found;
  }

  /** Detach this node (and its subtree) from its parent. */
  drop(): TreeNode<T> {
    const parent = this.parent;
    if (!parent) return this;
    const index = parent.children.indexOf(this);
    if (index !== -1) parent.children.splice(index, 1);
    const modelChildren = parent.model.children;
    if (Array.isArray(modelChildren)) {
      const modelIndex = modelChildren.indexOf(this.model);
      if (modelIndex !== -1) modelChildren.splice(modelIndex, 1);
    }
    this.parent = null;
    return this;
  }

  addChildAtIndex(child: TreeNode<T>, index: number): TreeNode<T> {
    if (index < 0 || index > this.children.length) {
      throw new Error(`Invalid index ${index} for ${this.children.length} children`);
    }
    child.parent = this;
    this.children.splice(index, 0, child);
    if (!Array.isArray(this.model.children)) this.model.children = [];
    this.model.children.splice(index, 0, child.model);
    return child;
  }
}

/** Build a TreeNode hierarchy from a nested model ({ ..., children: [...] }). */
export function parseTree<T extends TreeModelLike>(model: T): TreeNode<T> {
  const node = new TreeNode(model);
  for (const childModel of model.children || []) {
    const child = parseTree(childModel as T);
    child.parent = node;
    node.children.push(child);
  }
  return node;
}
