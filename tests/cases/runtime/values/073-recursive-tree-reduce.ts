// xl:title 递归走树：reduce 累积 + 闭包内自引用
// xl:judge stdout
// xl:end

type N = { v: number; kids: N[] };
const tree: N = { v: 1, kids: [{ v: 2, kids: [] }, { v: 3, kids: [{ v: 4, kids: [] }] }] };
const sum = (n: N): number => n.v + n.kids.reduce((acc, k) => acc + sum(k), 0);
console.log(sum(tree));
