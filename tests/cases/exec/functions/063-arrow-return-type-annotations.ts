// xl:title 箭头的返回类型标注（数组 / 联合 / 元组 / 类型字面量）与块体
// xl:round 375
// xl:judge stdout
// xl:end
// **返回类型标注长什么样，都不能把箭头的块体带成类型字面量**。
const build = (list: number[]): number[] => {
  const out: number[] = [];
  for (const v of list) out.push(v * 2);
  return out;
};
console.log("A", build([1, 2]).join(","));
const pick = (cells: string[]): string | null => {
  if (cells.length === 0) return null;
  return cells[0];
};
console.log("B", pick(["x"]), pick([]));
const tuple = (): [number, string] => {
  return [1, "s"];
};
console.log("C", tuple().join(":"));
const obj = (n: number): { v: number } => {
  return { v: n + 1 };
};
console.log("D", obj(2).v);
const gen = (n: number): Array<number> => {
  return [n];
};
console.log("E", gen(3).length);
const plain = (n: number): number => {
  return n;
};
console.log("F", plain(4));
const noAnno = (n: number) => {
  return n * 2;
};
console.log("G", noAnno(5));
const nested = (xs: number[]): number[] => {
  const inner = (ys: number[]): number[] => {
    return ys;
  };
  return inner(xs);
};
console.log("H", nested([6]).join(","));
