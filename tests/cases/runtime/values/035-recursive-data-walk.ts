// xl:title 递归走一棵树，用 reduce + concat 收集路径
// xl:judge stdout
// xl:end

type Node = { name: string; kids: Node[] };
const tree: Node = {
  name: "root",
  kids: [{ name: "a", kids: [] }, { name: "b", kids: [{ name: "c", kids: [] }] }],
};
function paths(n: Node, prefix: string): string[] {
  const here = prefix + n.name;
  if (n.kids.length === 0) return [here];
  return n.kids.reduce((acc, k) => acc.concat(paths(k, here + "/")), [] as string[]);
}
console.log(paths(tree, "").join(" "));
