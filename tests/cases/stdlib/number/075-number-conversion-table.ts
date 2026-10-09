// xl:title `Number(x)` 的转换表：字符串 / 空白 / 进制前缀 / 空值 / 对象
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的四十余条**（同一件事被逐批重抄的结果）：
//   probe-n01 · probe-n02 · probe-n03 · probe-n04 · probe-n25 · probe-n26 ·
//   probe2-p18 · probe2-p19 · probe2-p20 · probe2-p21 · probe2-p22 · probe2-p23 ·
//   probe2-p24 · probe2-p25 · probe2-p26 · probe693-n01 · probe693-n02 · probe693-n03 ·
//   probe693-n04 · probe693-n05 · probe693-n06 · probe693-n07 · probe693-n08 ·
//   probe693-n09 · probe693-n10 · probe693-n11 · probe693-n12 · probe693-n13 ·
//   probe693-n14 · probe693-n15 · probe695-n10 · probe695-n11 · probe695-n12 ·
//   probe695-n13 · probe695-n14 · probe697-n11 · probe697-n12 · probe701-n-e29 ·
//   probe701-n-e30 · probe701-n-e31 · probe701-n-e44 · probe703-n-c19 · probe703-n-c49 ·
//   probe703-n-c50 · probe703-n-c51 · probe703-n-c52 · probe703-n-c53 · probe703-n-c54 ·
//   probe703-n-c55
//
// 判定点只有一个：**`Number(x)` 那一张转换表**（它**不**做 `parseInt` 式的截断）——
//  ① 前后空白（含 `\t\n`）剥掉，中间有空白就是 `NaN`；
//  ② 空串 / 全空白给 **0**（`parseInt` 给 `NaN`，那是另一条）；
//  ③ `0x` / `0o` / `0b` 三个前缀**认**（`0x` 那一条 `parseInt` 也认）；`"1_000"` / `"12px"` 给 `NaN`；
//  ④ `null` → 0、`true` → 1、`undefined` → `NaN`、`"-0"` → `-0`；
//  ⑤ 对象走 `ToPrimitive`：`[]` → 0、`[5]` → 5、`[1,2]` / `{}` → `NaN`；
//  ⑥ `"Infinity"` / `"1e999"` 给 `Infinity`。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(Number("")));
  console.log(show(Number("   ")));
  console.log(show(Number("  \t\n 5 ")));
  console.log(show(Number(" 12 ")));
  console.log(show(Number("5 5")));
  console.log(show(Number("12px")));
  console.log(show(Number("0x10")));
  console.log(show(Number("0o17")));
  console.log(show(Number("0b11")));
  console.log(show(Number("1_000")));
  console.log(show(Number("1n")));
  console.log(show(Number("1e3")));
  console.log(show(Number("1e-3")));
  console.log(show(Number("1e999")));
  console.log(show(Number("Infinity")));
  console.log(show(Number("0x")));
  console.log(show(Number("-0")));
  console.log(show(Number("+1")));
  console.log(show(Number(null)));
  console.log(show(Number(true)));
  console.log(show(Number(undefined)));
  console.log(show(Number([])));
  console.log(show(Number([5])));
  console.log(show(Number([1, 2])));
  console.log(show(Number({})));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
