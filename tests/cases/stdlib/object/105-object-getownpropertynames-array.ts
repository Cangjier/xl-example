// xl:title `Object.getOwnPropertyNames(数组)`：下标 + `length` + 额外自有格，符号键不在
// xl:judge stdout
// xl:end
// 判定点：**数组上额外挂上去的自有格（`xs.extra`）也进这一族**。
// 与 `172-object-getownpropertynames-array` 的区别写在明处：`172` 量的是
// **下标 + `length`**（那条由四条逐字节相同的探针合并而来），这一条量的是
// **额外自有格也算**——同 API 的两个判定点，所以两条都留。
//
// 本条原来混了三个判定点（数组名表 / `Object.keys` / 字符串名表），
// 按「一条用例一个判定点」收敛到第一件：字符串那一件归 `173`。
const xs: any[] = [1, 2];
xs.extra = "e";
console.log(Object.getOwnPropertyNames(xs).join(","));
console.log(Object.keys(xs).join(","));
// 符号键不在这一族里（那是 `getOwnPropertySymbols` 那一格的事）
xs[Symbol("s")] = 3;
console.log(Object.getOwnPropertyNames(xs).join(","), Object.getOwnPropertySymbols(xs).length);
