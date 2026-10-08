// xl:title well-known symbol 的名字在不在（只问名字，不调协议）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why well-known symbol 只装了一半：13 个里 `iterator` / `asyncIterator` / `toPrimitive` / `toStringTag` / `species` / `hasInstance` 在，缺 `isConcatSpreadable` / `unscopables` 与 `match` / `replace` / `search` / `split` / `matchAll` 五个 —— 后五个正是 `RegExp` 协议那一族 （`RegExp` 是非目标），但 **`isConcatSpreadable` / `unscopables` 与 `RegExp` 无关**，它们是 `Array.prototype.concat` / `with` 与 `with` 语句那两个协议的名字，属于「少装两格」；与（其一）`r678-names-symbol` 同一处成员表（那条记的是同一件事的名单形态）
// xl:end

const names: string[] = ["iterator", "asyncIterator", "toPrimitive", "toStringTag", "species", "hasInstance", "isConcatSpreadable", "match", "replace", "split", "search", "matchAll", "unscopables"];
for (const n of names) {
  console.log(n, String(typeof (Symbol as any)[n]));
}
