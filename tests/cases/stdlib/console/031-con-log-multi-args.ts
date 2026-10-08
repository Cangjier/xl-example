// xl:title 多实参之间空一格、`%s` 不生效
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why `console.log` 的 `%s` / `%d` 那一族格式说明符没做（Node 的 `console.log` 走 `util.format`）：
//       本仓把第一个实参当普通值印成 `%s x`。要做。
// xl:end
console.log("a", 1, { b: 2 });
console.log("%s", "x");
console.log();
console.log(undefined, null, true);
