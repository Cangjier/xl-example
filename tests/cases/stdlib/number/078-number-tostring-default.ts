// xl:title 数值 → 文本的默认形态：`1e21` / `1e-7` / `-0` / `Infinity` / 大整数
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的三十余条**：
//   probe-n07 · probe-n09 · probe2-p10 · probe2-p11 · probe2-p12 · probe693-n31 ·
//   probe693-n32 · probe693-n33 · probe693-n35 · probe695-n20 · probe697-n04 ·
//   probe697-n18 · probe697-n19 · probe701-n-e09 · probe701-n-e10 · probe701-n-e46 ·
//   probe701-n-e47 · probe701-n-e48 · probe703-n-c03 · probe703-n-c29 · probe703-n-c47 ·
//   probe703-n-c48 · probe703-n-c56 · probe703-n-c59 · probe705-n-f01 · probe705-n-f02 ·
//   probe705-n-f06 · probe705-n-f07 · probe705-n-f08 · probe705-n-f09 · probe705-n-f10 ·
//   probe705-n-f19 · probe705-n-f20
//
// 判定点只有一个：**`ToString(Number)` 的指数分界**——
//  ① `>= 1e21` 走指数形态（`"1e+21"`），`< 1e21` 走定点；
//  ② `< 1e-6` 走指数形态（`"1e-7"`），`>= 1e-6` 走定点（`"0.000001"`）；
//  ③ `-0` 印成 `"0"`（符号丢了）；`Infinity` / `NaN` 各印各的名；
//  ④ 超出安全整数范围的数按**最近的 double** 印（`1000000000000000128` 印成 `…128`，
//     那是它真的表示的那个值）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show((1e21).toString()));
  console.log(show((1e-7).toString()));
  console.log(show((0.000001).toString()));
  console.log(show((0.0000001).toString()));
  console.log(show(String(-0)));
  console.log(show((-0).toString()));
  console.log(show((0.1).toString()));
  console.log(show((1.5).toString()));
  console.log(show((123456789).toString()));
  console.log(show((1000000).toString()));
  console.log(show((1000000000000000000000).toString()));
  console.log(show((123456789012345678901234567890).toString()));
  console.log(show((1000000000000000128).toString()));
  console.log(show((Infinity).toString()));
  console.log(show((NaN).toString()));
  console.log(show(String(1e21)));
  console.log(show(String(1e-7)));
  console.log(show(1 / -0));
  console.log(show(Object.is(1 / -0, -Infinity)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
