// xl:title `String.prototype` 的成员表：正则那一族三格没装（账）
// xl:round 676
// xl:judge stdout
// xl:want differ
// xl:why `String.prototype` 的 `match` / `search` / `matchAll` 三个成员没装（`node` 上是函数）：成员表里没有那三格。
//        第 718 轮之前这一行有 19 个名字，其中 16 个是**同一族的两种代价**：anchor / big / blink / bold /
//        fixed / fontcolor / fontsize / italics / link / small / strike / sub / sup 十三格只要字符串拼接
//        （第 718 轮做出来了），trimLeft / trimRight 是 trimStart / trimEnd 的别名（同一轮），length 是那一格 0。
//        **剩下这三个要 RegExp 整族**，与 `136` / `146` / `147` 同一条根。
// xl:end
// **第 812 轮并组**：这一条原来叫 `136-r676-std-string-regex-members`，与 `147-names-string-proto`
// 问的是同一张成员表（一条问几个键、一条把整表逐格问一遍），这一轮把 `147` 的正文逐字搬进下面那一块、
// 来源文件下盘，并按要求改成描述性命名（序号取域内下一个空位）。
function has(obj: any, key: string): string {
  return typeof obj[key] === "function" ? key : "";
}
const names = ["at", "padStart", "replaceAll", "match", "search", "matchAll", "split", "trim"];
console.log(names.map((k) => has(String.prototype, k)).join(","));
console.log(typeof String.prototype.match, typeof String.prototype.search, typeof String.prototype.matchAll);

// ===== 第 812 轮并入：1 条同判定点来源（正文逐字照搬） =====

// ---- 并自 147-names-string-proto.ts ----
(() => {
const b: any = String.prototype;
let v = "";
v = "no";
try {
  v = String(typeof b["anchor"]);
} catch (err) {
}
console.log(typeof b, "anchor", v);
v = "no";
try {
  v = String(typeof b["big"]);
} catch (err) {
}
console.log(typeof b, "big", v);
v = "no";
try {
  v = String(typeof b["blink"]);
} catch (err) {
}
console.log(typeof b, "blink", v);
v = "no";
try {
  v = String(typeof b["bold"]);
} catch (err) {
}
console.log(typeof b, "bold", v);
v = "no";
try {
  v = String(typeof b["fixed"]);
} catch (err) {
}
console.log(typeof b, "fixed", v);
v = "no";
try {
  v = String(typeof b["fontcolor"]);
} catch (err) {
}
console.log(typeof b, "fontcolor", v);
v = "no";
try {
  v = String(typeof b["fontsize"]);
} catch (err) {
}
console.log(typeof b, "fontsize", v);
v = "no";
try {
  v = String(typeof b["italics"]);
} catch (err) {
}
console.log(typeof b, "italics", v);
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
v = "no";
try {
  v = String(typeof b["link"]);
} catch (err) {
}
console.log(typeof b, "link", v);
v = "no";
try {
  v = String(typeof b["match"]);
} catch (err) {
}
console.log(typeof b, "match", v);
v = "no";
try {
  v = String(typeof b["matchAll"]);
} catch (err) {
}
console.log(typeof b, "matchAll", v);
v = "no";
try {
  v = String(typeof b["search"]);
} catch (err) {
}
console.log(typeof b, "search", v);
v = "no";
try {
  v = String(typeof b["small"]);
} catch (err) {
}
console.log(typeof b, "small", v);
v = "no";
try {
  v = String(typeof b["strike"]);
} catch (err) {
}
console.log(typeof b, "strike", v);
v = "no";
try {
  v = String(typeof b["sub"]);
} catch (err) {
}
console.log(typeof b, "sub", v);
v = "no";
try {
  v = String(typeof b["sup"]);
} catch (err) {
}
console.log(typeof b, "sup", v);
v = "no";
try {
  v = String(typeof b["trimLeft"]);
} catch (err) {
}
console.log(typeof b, "trimLeft", v);
v = "no";
try {
  v = String(typeof b["trimRight"]);
} catch (err) {
}
console.log(typeof b, "trimRight", v);
console.log("缺", 19, "个名字");
})();
