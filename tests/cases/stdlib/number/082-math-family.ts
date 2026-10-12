// xl:title `Math` 那一族：常数、取整、符号与几个特例
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的四十余条**：
//   probe693-n47 · probe693-n48 · probe693-n49 · probe693-n50 · probe693-n51 ·
//   probe693-n52 · probe693-n53 · probe693-n54 · probe693-n55 · probe693-n56 ·
//   probe693-n57 · probe693-n58 · probe693-n59 · probe693-n60 · probe697-n13 ·
//   probe697-n14 · probe697-n15 · probe697-n16 · probe697-n17 · probe701-n-e11 ·
//   probe701-n-e12 · probe701-n-e13 · probe701-n-e14 · probe701-n-e15 · probe701-n-e16 ·
//   probe701-n-e17 · probe701-n-e18 · probe701-n-e19 · probe701-n-e20 · probe701-n-e21 ·
//   probe701-n-e22 · probe701-n-e24 · probe701-n-e25 · probe701-n-e26 · probe701-n-e39 ·
//   probe701-n-e40 · probe701-n-e43 · probe703-n-c07 · probe703-n-c08 · probe703-n-c09 ·
//   probe703-n-c10 · probe703-n-c11 · probe703-n-c12 · probe703-n-c13 · probe703-n-c14 ·
//   probe703-n-c15 · probe703-n-c16 · probe703-n-c17 · probe703-n-c31 · probe703-n-c32 ·
//   probe703-n-c33 · probe703-n-c34 · probe703-n-c35 · probe703-n-c36 · probe703-n-c37 ·
//   probe703-n-c38 · probe703-n-c39 · probe703-n-c40 · probe703-n-c41 · probe703-n-c42 ·
//   probe703-n-c43 · probe703-n-c44 · probe703-n-c45
//
// 判定点只有一个：**`Math` 的取整与符号族在边界上的读数**——
//  ① `round(x)` 是**半值向 +∞**（`round(-0.5)` 给 `-0`、`round(2.5)` 给 3）；
//     `ceil` / `floor` / `trunc` 三支各自的负半边；
//  ② `sign(-0)` 给 `-0`、`abs(-0)` 给 `0`；
//  ③ 空实参：`Math.max()` 给 `-Infinity`、`Math.min()` 给 `Infinity`；
//     `Math.max(1, NaN, 3)` 给 `NaN`；`Math.min(0, -0)` 给 `-0`、`Math.max(-0, 0)` 给 `0`；
//  ④ 几个两参/一参函数：`cbrt` / `hypot` / `imul` / `clz32` / `fround` / `pow` / `log2` /
//     `log10` / `expm1` / `sinh` / `tanh` / `asinh` / `acosh` / `atan2`；
//  ⑤ `Math.random` 是函数（不判它的值）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(Math.round(-0.5)));
  console.log(show(Object.is(Math.round(-0.5), -0)));
  console.log(show(Math.round(2.5)));
  console.log(show(Math.ceil(-0.5) + "," + Math.floor(-0.5)));
  console.log(show(Math.trunc(-1.7)));
  console.log(show(Math.trunc(-0.9)));
  console.log(show(Math.trunc(-0.5)));
  console.log(show(Math.sign(-0)));
  console.log(show(Math.sign(-3)));
  console.log(show(Math.abs(-0)));
  console.log(show(Object.is(Math.abs(-0), 0)));
  console.log(show(Math.max()));
  console.log(show(Math.min()));
  console.log(show(Math.max(1, NaN, 3)));
  console.log(show(Math.min(0, -0)));
  console.log(show(Math.max(-0, 0)));
  console.log(show(Math.cbrt(-8)));
  console.log(show(Math.cbrt(27)));
  console.log(show(Math.hypot(3, 4)));
  console.log(show(Math.imul(3, 4)));
  console.log(show(Math.clz32(1)));
  console.log(show(Math.fround(0.1)));
  console.log(show(Math.fround(1.1)));
  console.log(show(Math.pow(-8, 1 / 3)));
  console.log(show(Math.pow(2, 10)));
  console.log(show(2 ** 10));
  console.log(show((-2) ** 2));
  console.log(show(Math.log2(8)));
  console.log(show(Math.log10(1000)));
  console.log(show(Math.expm1(0)));
  console.log(show(Math.sinh(0)));
  console.log(show(Math.tanh(0)));
  console.log(show(Math.asinh(0)));
  console.log(show(Math.acosh(1)));
  console.log(show(Math.atan2(1, 1)));
  console.log(show(typeof Math.random));
  console.log(show(Math.f16round(1.1)));
  console.log(show(1 / 3));
  console.log(show(Boolean(-0)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
