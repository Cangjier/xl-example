// xl:title 两层箭头里的 `this`：箭头自己不开格，取最近那个普通函数
// xl:round 374
// xl:judge stdout
// xl:end
// 箭头**没有自己的接收者**——它的 this 是造它那一刻外层的，
// 而「外层」要一路走到**最近的那个普通函数 / 方法 / 构造函数**。
type Job = { name: string; deps: string[] };
class Board {
  done = new Set<string>(["build"]);
  jobs(): Job[] { return [{ name: "a", deps: ["build"] }, { name: "b", deps: ["x"] }]; }
  ready(): Job[] { return this.jobs().filter((j) => j.deps.every((d) => this.done.has(d))); }
  names(): string[] { return this.jobs().filter((j) => j.deps.some((d) => this.done.has(d))).map((j) => j.name); }
}
const b = new Board();
console.log("A", b.ready().length, b.names().join(","));

class Level2 {
  factor = 10;
  apply(xs: number[]): number[] { return xs.map((x) => xs.map((y) => x + y + this.factor)[0]); }
}
console.log("B", new Level2().apply([1, 2]).join(","));

class FieldArrow {
  factor = 5;
  f = (xs: number[]): number => xs.filter((x) => x > this.factor).length;
}
console.log("C", new FieldArrow().f([1, 6, 9]));

class ThreeDeep {
  base = 1;
  run(): number { return [[2]].map((outer) => outer.map((n) => [n].map((m) => m + this.base)[0])[0])[0]; }
}
console.log("D", new ThreeDeep().run());

function outerFn(this: any): number {
  return [1].map(() => [2].map(() => this.tag)[0])[0];
}
console.log("E", outerFn.call({ tag: "t" }));
