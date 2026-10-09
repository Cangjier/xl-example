// xl:title `Number.isInteger` / `isSafeInteger` / `isFinite` / `isNaN` 与全局那两个的分工
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe-n21 · probe-n22 · probe-n23 · probe-n24 · probe693-n37 · probe693-n38 ·
//   probe693-n39 · probe693-n40 · probe697-n05 · probe697-n06 · probe701-n-e01 ·
//   probe701-n-e02 · probe701-n-e03 · probe703-n-c21 · probe703-n-c22 · probe703-n-c23 ·
//   probe703-n-c24 · p-num-isinteger
//   ＋ `001-number-isinteger-isfinite` / `008-global-isnan-isfinite` / `014-number-static-family`
//     / `028-number-isnan-forms` / `033-global-isnan-coercion` / `036-global-isfinite-vs-number`
//     / `050-number-is-methods` / `060-number-parse-and-predicates`
//
// 判定点只有一个：**`Number.*` 那一族不做转换，全局那两个做**——
//  ① `Number.isNaN("NaN")` 假、`isNaN("NaN")` 真（后者先 `ToNumber`）；
//  ② `Number.isFinite("1")` 假、`isFinite("1")` 真；
//  ③ `isInteger`：`1.0` 真（它就是 1）、`-0` 真、`NaN` / `Infinity` 假；
//  ④ `isSafeInteger`：`2 ** 53` 假（上界之外）、`2 ** 53 - 1` 真；
//  ⑤ 常量那几个：`EPSILON > 0`、`MIN_VALUE > 0`、`MAX_SAFE_INTEGER` 就是 `2 ** 53 - 1`。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(Number.isNaN(NaN)));
  console.log(show(Number.isNaN("NaN")));
  console.log(show(isNaN("NaN")));
  console.log(show(Number.isFinite("1")));
  console.log(show(isFinite("1")));
  console.log(show(Number.isFinite(1)));
  console.log(show(Number.isInteger(1.0)));
  console.log(show(Number.isInteger(-0)));
  console.log(show(Number.isInteger(1.5)));
  console.log(show(Number.isInteger(NaN)));
  console.log(show(Number.isInteger(Infinity)));
  console.log(show(Number.isSafeInteger(2 ** 53)));
  console.log(show(Number.isSafeInteger(2 ** 53 - 1)));
  console.log(show(Number.EPSILON > 0));
  console.log(show(Number.MIN_VALUE > 0));
  console.log(show(Number.MAX_SAFE_INTEGER));
  console.log(show((2 ** 53 + 1) === 2 ** 53));
  console.log(show(0.1 + 0.2 === 0.3));
  console.log(show(0.1 * 3));
  console.log(show(1e3 === 1000));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
