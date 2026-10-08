// xl:title well-known symbol 的名字在不在（只问名字，不调协议）
// xl:round 678
// xl:judge stdout
// xl:why 第 690 轮**收掉了台账**：缺的七个名字一次补齐（`isConcatSpreadable` /
//       `unscopables` 与 `match` / `replace` / `search` / `split` / `matchAll`）——
//       **名字与协议是两件事**：JS 里这些符号永远存在，而用到它们的那几个方法
//       （`String.prototype.match` 那一族）与 `RegExp` 本身仍是待做项。
//       名单同时收成一个局部量（原来两处各写一遍，漂了看不出）。
// xl:end

const names: string[] = ["iterator", "asyncIterator", "toPrimitive", "toStringTag", "species", "hasInstance", "isConcatSpreadable", "match", "replace", "split", "search", "matchAll", "unscopables"];
for (const n of names) {
  console.log(n, String(typeof (Symbol as any)[n]));
}
