// xl:title `Number` 的静态那一族：判定、边界常量与 `parseInt` 的同一性
// xl:round 767
// xl:judge stdout
// xl:note `isInteger` / `isFinite` / `isNaN` 与**全局**那三个**不是一件事**：
// xl:note 静态那几个**不做类型转换**（`Number.isFinite("1")` 给假，全局 `isFinite("1")` 给真）。
// xl:note 边界常量与安全整数那两档一起钉（`2 ** 53` 那个分界）。
// xl:note `Number.parseInt === parseInt` 那一格钉的是「同一个函数对象」——
// xl:note 另造一个句柄会让 `===` 为假（第 733 轮 `CreateHostRef` 那条教训）。
// xl:end
console.log("01", Number.isInteger(1), Number.isInteger(1.5), Number.isInteger("1" as any));
console.log("02", Number.isFinite(1), Number.isFinite(NaN), Number.isFinite("1" as any), isFinite("1" as any));
console.log("03", Number.isNaN(NaN), Number.isNaN("x" as any), isNaN("x" as any));
console.log("04", Number.isSafeInteger(2 ** 53 - 1), Number.isSafeInteger(2 ** 53));
console.log("05", Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.EPSILON > 0, Number.MAX_VALUE > 1e308);
console.log("06", Number.parseInt === parseInt, Number.parseFloat === parseFloat);
console.log("07", Number.NaN !== Number.NaN, Number.POSITIVE_INFINITY > 0, Number.NEGATIVE_INFINITY < 0);
