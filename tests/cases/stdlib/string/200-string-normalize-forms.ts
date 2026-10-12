// xl:title `normalize` 的四种形式：恒等 / 合一 / 省略实参 / 非法形式
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的十一条**（第 692 轮那一次并组）：
//   probe-s21 · probe693-y34 · probe696-s15 · probe703-s-e16 · probe703-s-e20 ·
//   probe699-s-t01（无关那一半）· probe110-string-normalize-r623 · probe132-string-normalize-r676
//   ＋ `097-string-normalize-r371` / `120-string-normalize-forms-root`（同一件事的第一、二份）
// **第 812 轮又并进 9 条**（它们自称并过、文件却一直留在盘上，正文见下面各块；来源已下盘）：
//   039-string-normalize-root · 053-string-normalize-ascii · 065-string-normalize-ascii-forms ·
//   072-string-normalize-forms-r305 · 085-normalize-forms · 097-string-normalize-r371 ·
//   110-string-normalize-r623 · 120-string-normalize-forms-root · 132-string-normalize-r676
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

// ===== 第 812 轮并入：9 条同判定点来源（正文逐字照搬） =====

// ---- 并自 039-string-normalize-root.ts ----
(() => {
const s = "e\u0301";
console.log(s.length, s.normalize("NFC").length, s.normalize("NFC") === "\u00e9");
})();

// ---- 并自 053-string-normalize-ascii.ts ----
(() => {
console.log("abc".normalize("NFC"), "e\u0301".normalize("NFC").length, "e\u0301".length);
})();

// ---- 并自 065-string-normalize-ascii-forms.ts ----
(() => {
const s = "abc";
console.log(s.normalize(), s.normalize("NFC") === s, s.normalize("NFD") === s);
console.log("e\u0301".normalize("NFC").length, "\u00e9".normalize("NFD").length);
})();

// ---- 并自 072-string-normalize-forms-r305.ts ----
(() => {
console.log("abc".normalize("NFC"), "abc".normalize("NFD"), "abc".normalize(), "abc".normalize("NFKC") === "abc");
})();

// ---- 并自 085-normalize-forms.ts ----
(() => {
const composed = "\u00e9";
const decomposed = "e\u0301";
console.log(composed.length, decomposed.length);
console.log(decomposed.normalize("NFC").length, decomposed.normalize("NFC") === composed);
console.log(composed.normalize("NFD").length, composed.normalize("NFD") === decomposed);
console.log("abc".normalize("NFKC"), "\uFB01".normalize("NFKC"), "\uFB01".length);
try {
  "abc".normalize("NFX");
} catch (e) {
  console.log((e as Error).name);
}
})();

// ---- 并自 097-string-normalize-r371.ts ----
(() => {
const composed = "\u00e9";
const decomposed = "e\u0301";
console.log(composed.length, decomposed.length);
console.log(composed.normalize("NFD").length, decomposed.normalize("NFC").length);
console.log(composed.normalize("NFC") === composed, composed.normalize() === composed);
console.log(decomposed.normalize("NFC") === composed);
})();

// ---- 并自 110-string-normalize-r623.ts ----
(() => {
const s = "\u00e9";
console.log(s.normalize("NFC") === s, s.normalize("NFD").length, s.normalize().length);
console.log("\u0041\u030a".normalize("NFC"), "\u00c5".normalize("NFD").length);
})();

// ---- 并自 120-string-normalize-forms-root.ts ----
(() => {
const s = "\u00e9";
console.log(s.length, s.normalize().length, s.normalize("NFD").length, s.normalize("NFC") === s);
console.log("\u0041\u030a".normalize("NFC"), "\u0041\u030a".normalize("NFD").length);
})();

// ---- 并自 132-string-normalize-r676.ts ----
(() => {
const s = "\u00e9";
console.log(s.length, s.normalize("NFD").length, s.normalize("NFC").length);
console.log(s.normalize("NFD").codePointAt(0), s.normalize("NFD").codePointAt(1));
console.log("\uFB01".normalize("NFKC"), "\uFB01".length);
})();
