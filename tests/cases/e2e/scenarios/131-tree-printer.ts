// xl:title 树结构的美化打印与路径查找
// xl:round 371
// xl:judge stdout
// xl:end
type TreeNode = { name: string; children: TreeNode[] };
function make(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", children: [] };
  for (const path of paths) {
    const parts = path.split("/").filter((p) => p !== "");
    let cur = root;
    for (const part of parts) {
      let next = cur.children.find((c) => c.name === part);
      if (!next) { next = { name: part, children: [] }; cur.children.push(next); }
      cur = next;
    }
  }
  return root;
}
function print(node: TreeNode, prefix = "", out: string[] = []): string[] {
  node.children.forEach((child, index) => {
    const last = index === node.children.length - 1;
    out.push(prefix + (last ? "\\-- " : "|-- ") + child.name);
    print(child, prefix + (last ? "    " : "|   "), out);
  });
  return out;
}
function find(node: TreeNode, name: string, path: string[] = []): string[] | null {
  if (node.name === name) return path;
  for (const child of node.children) {
    const hit = find(child, name, path.concat(child.name));
    if (hit) return hit;
  }
  return null;
}
const tree = make(["src/app/main.ts", "src/app/util.ts", "src/lib/core.ts", "docs/readme.md"]);
for (const line of print(tree)) console.log(line);
console.log((find(tree, "core.ts") ?? []).join("/"));
console.log(find(tree, "nope.ts"), tree.children.length);
