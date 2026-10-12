// xl:title `trim` / `trimStart` / `trimEnd` 吃的空白集合
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十四条**：
//   probe-s08 · probe-s30 · probe3-y11 · probe693-y21 · probe693-y22 · probe695-y09 ·
//   probe696-s16 · probe703-s-e06 · probe703-s-e22 · probe703-s-e23 · probe705-s-g10 ·
//   probe705-s-g06（与 `charAt` 无关那一半不算，见 `193`）
// 判定点只有一个：**`WhiteSpace` + `LineTerminator` 那张表**——
//  ① ASCII 空白（空格 / 制表 / 换行）两头都吃；
//  ② 非 ASCII：`\u00a0`（不换行空格）**在表里**，所以它被吃掉；
//  ③ `trimStart` / `trimEnd` 各管一头（另一头原样）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("\u00a0x".trim()));
  console.log(show("\t\n x".trim().length));
  console.log(show(" x ".trim().length));
  console.log(show("  a b  ".trim()));
  console.log(show("  ".trim()));
  console.log(show("  a  ".trimStart().length));
  console.log(show("  a  ".trimEnd().length));
  console.log(show("  x  ".trimEnd()));
  console.log(show("abc".trimStart()));
  console.log(show("abc".trimEnd()));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
