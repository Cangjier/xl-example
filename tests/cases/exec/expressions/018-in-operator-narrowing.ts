// xl:title `in` 当类型守卫（值位照常跑）
// xl:judge stdout
// xl:end

type A = { kind: "a"; x: number };
type B = { kind: "b"; y: string };
function f(v: A | B): string { return "x" in v ? "x=" + v.x : "y=" + v.y; }
console.log(f({ kind: "a", x: 1 }), f({ kind: "b", y: "s" }));
console.log("x" in { x: 1 }, "toString" in {});
