// xl:title `normalize` 的四种形式：在已规范化的串上恒等、组合字符上合一
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十一条**：
//   probe-s21 · probe693-y34 · probe696-s15 · probe703-s-e16 · probe703-s-e20 ·
//   probe699-s-t01（无关那一半）· probe110-string-normalize-r623 · probe132-string-normalize-r676
//   ＋ `097-string-normalize-r371` / `120-string-normalize-forms-root`（同一件事的第一、二份）
//
// 判定点只有一个：**`String.prototype.normalize` 那张表**——
//  ① 四种形式（`NFC` / `NFD` / `NFKC` / `NFKD`）在已规范化的 ASCII 上都是**恒等**；
//  ② 组合字符（`"é"` 分解成 `e` + U+0301）在 `NFD` 下**长度变 2**；
//  ③ 省略实参等同 `NFC`；
//  ④ 非法形式抛 `RangeError`（那一面在 `144-l677p-str-nonregex-errors` 里）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("abc".normalize("NFD").length));
  console.log(show("abc".normalize()));
  console.log(show("é".normalize("NFD").length));
  console.log(show("e\u0301".normalize("NFD").length));
  console.log(show("abc".normalize("NFC")));
  console.log(show("abc".normalize("NFKC")));
  console.log(show("abc".normalize("NFKD")));
  // ② 合一：`NFD` 拆开之后再 `NFC` 合回来是恒等
  console.log(show("é".normalize("NFD").normalize("NFC") === "é"));
  console.log(show("é".normalize("NFD").length + "," + "é".normalize("NFC").length));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
