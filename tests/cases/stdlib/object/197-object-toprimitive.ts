// xl:title `ToPrimitive`：`valueOf` / `toString` / `Symbol.toPrimitive` 的优先顺序
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十六条**：
//   probe698-b01 · probe698-b02 · probe698-b03 · probe698-b04 · probe698-b05 · probe698-b06 ·
//   probe698-b07 · probe698-b08 · probe698-b09 · probe698-b10 · probe698-b11 · probe698-b12 ·
//   probe698-b13 · probe698-b15
//   ＋ `087-object-valueof-and-conversion`（同一件事的成稿那一份）
//
// 判定点只有一个：**`ToPrimitive` 挑哪一格**——
//  ① `Symbol.toPrimitive` 在就由它说了算（带 `hint` 参数）；
//  ② 否则按 `hint` 排：**数字**那一档先 `valueOf` 再 `toString`，**字符串**那一档反过来；
//  ③ 两格都给不出原始值时抛 `TypeError`；
//  ④ `+` / 模板串 / `String()` / 比较 / `join` 各自带哪个 `hint`。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(({ valueOf: () => 5 }) + 1));
  console.log(show(({ toString: () => "x" }) + 1));
  console.log(show(({ valueOf: () => 1, toString: () => "t" }) == 1));
  console.log(show(String({ valueOf: () => 1, toString: () => "t" } as any)));
  console.log(show(({ valueOf: () => 2 }) * 3));
  console.log(show(({ toString: () => "3" }) < 4));
  console.log(show(({ valueOf: () => "v" }) as any) + "|" + show(`${ { valueOf: () => "v" } }`));
  console.log(show(`${ { toString: () => "T" } }`));
  console.log(show(String({ valueOf: () => ({}), toString: () => "S" } as any)));
  console.log(show(({ valueOf: () => 1 } as any) === 1 ? "same" : show([{ valueOf: () => 1 }, { valueOf: () => 1 }].join("-"))));
  console.log(show(({} as any) + ""));
  console.log(show(Object.is(({ valueOf: () => -0 }) * 1, -0)));
  // `Symbol.toPrimitive` 那一档
  console.log(show(({ [Symbol.toPrimitive]: () => 2 }) + 3));
  const hinted: any = { [Symbol.toPrimitive]: (h: string) => (h === "number" ? 7 : "s") };
  console.log(show([hinted + 0, String(hinted)].join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
