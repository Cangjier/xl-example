// xl:title `isWellFormed` / `toWellFormed`：落单代理给假、换成 U+FFFD、其余原样
// xl:round 330
// xl:judge stdout
// xl:end
// **第 812 轮并组**：这一条是 `080-string-towellformed`，把同一判定点的两条吸进来、来源下盘：
//   079-string-wellformed-r330 · 133-string-wellformed-r676
// 判定点只有一个：**`String.prototype.isWellFormed` / `toWellFormed` 对落单代理的处理**——
//  `isWellFormed()` 对落单代理给 `false`、对成对代理与纯 ASCII 给 `true`；
//  `toWellFormed()` 把落单代理换成 U+FFFD（长度不变）、成对代理与普通串原样交回；
//  换过之后的串自己 `isWellFormed()` 为 `true`。
const fixed = "a\uD800b".toWellFormed();
console.log(fixed.length, fixed.charCodeAt(1).toString(16));
console.log("\uD83D\uDE00".toWellFormed() === "\uD83D\uDE00");
console.log("ok".toWellFormed());

// ===== 第 812 轮并入：2 条同判定点来源（正文逐字照搬） =====

// ---- 并自 079-string-wellformed-r330.ts ----
(() => {
console.log("abc".isWellFormed(), "\uD800".isWellFormed(), "\uD83D\uDE00".isWellFormed());
console.log("a\uDFFFb".isWellFormed());
})();

// ---- 并自 133-string-wellformed-r676.ts ----
(() => {
const lone = "a\uD800b";
console.log(lone.isWellFormed(), "ab".isWellFormed());
console.log(lone.toWellFormed().isWellFormed(), lone.toWellFormed().length);
})();
