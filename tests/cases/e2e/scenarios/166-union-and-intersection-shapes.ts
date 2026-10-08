// xl:title `A | (B & C)` 的两副面孔：值位是位运算、类型位是联合/交叉
// xl:round 384
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// 同一个形状、两种意思 —— 判据只能看**左边那一格**（第 384 轮）。
// 值位：位运算
const a = 1;
const b = 2;
const c = 3;
console.log("A", a | (b & c), 1 | (2 & 3), a & (b | c));
let v = 0;
v = 1 | (2 & 3);
console.log("B", v);
function f(): number {
  return 1 | (2 & 3);
}
console.log("C", f());
console.log("D", ((a + b) & 0xff) | 16);
// 类型位：联合 / 交叉（同样的括号形状）
type Wide = string | number;
type Both = { x: number } & { y: string };
type Mixed = Wide | (Both & { z: boolean });
type Leading =
  | (Both & { w: number })
  | Wide;
const wide: Wide = "s";
const both: Both = { x: 1, y: "y" };
const mixed: Mixed = both;
const leading: Leading = both;
console.log("E", typeof wide, both.x, both.y, mixed.y, leading.x);
interface HasOpts { mode?: Mixed | undefined; flag?: Leading | null; }
const opts: HasOpts = { mode: both, flag: both };
console.log("F", opts.mode !== undefined, opts.flag !== undefined);
console.log("G", a | (b & c) | (a & b), (a | b) & (b | c));
