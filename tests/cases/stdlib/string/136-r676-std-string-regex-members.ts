// xl:title String 原型上的成员表：正则那一族在不在（字符串键问一遍）
// xl:judge stdout
// xl:want differ
// xl:why `String.prototype` 的 `match` / `search` / `matchAll` 三个成员没装（`node` 上是函数）：成员表里没有那三格
// xl:end

function has(obj: any, key: string): string {
  return typeof obj[key] === "function" ? key : "";
}
const names = ["at", "padStart", "replaceAll", "match", "search", "matchAll", "split", "trim"];
console.log(names.map((k) => has(String.prototype, k)).join(","));
console.log(typeof String.prototype.match, typeof String.prototype.search, typeof String.prototype.matchAll);
