// xl:title `Math` 的边界：`round` 的半数、`min` / `max` 的空实参与 `-0`、`sign` / `trunc`
// xl:round 768
// xl:judge stdout
// xl:note `Math.round` 对**负数半数**是向正无穷（`round(-0.5)` 给 `-0`、`round(-2.5)` 给 `-2`）。
// xl:note `Math.min()` / `Math.max()` **不给实参**时给 `Infinity` / `-Infinity`；
// xl:note `max(0, -0)` 给 `+0` 还是 `-0` 用 `1 / 结果` 那一档看（打印 `0` 与 `-0` 分不出来）。
// xl:note `Math.abs(-0)` 给 `+0`、`Math.sign(-0)` 给 `-0`、`Math.sign(NaN)` 给 `NaN`。
// xl:note `trunc` / `floor` / `ceil` 对负数的三档一起钉，外加 `pow` 的 `NaN` 那一档。
// xl:end
console.log("01", Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5));
console.log("02", Math.min(), Math.max(), Math.min(1, 2), Math.max(-1, -2));
console.log("03", Math.min(NaN, 1), Math.max(0, -0) === 0, 1 / Math.max(0, -0), 1 / Math.min(0, -0));
console.log("04", Math.abs(-0), 1 / Math.abs(-0), Math.sign(-5), Math.sign(0), Math.sign(NaN));
console.log("05", Math.floor(-1.5), Math.ceil(-1.5), Math.trunc(-1.5), Math.trunc(1.5));
console.log("06", Math.pow(2, 10), Math.sqrt(9), Math.pow(-1, 0.5));
console.log("07", Math.min("1" as any, 2), Math.max(true as any, 2));
