// xl:title `for...of` 遍历 Set 时删掉当前元素再添加
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why 同上：`for...of` 遍历 `Set` 时**删掉还没走到的那一格**，那一格该**不被访问**
//       （Node 给 `1,3,4`、本仓给 `1,2,3`）。根是「迭代器不是活视图」。要做。
// xl:end
const s: any = new Set<any>([1, 2, 3]);
const seen: number[] = [];
for (const v of s) {
  seen.push(v);
  if (v === 1) { s.delete(2); s.add(4); }
}
console.log(seen.join(","), [...s].join(","));
