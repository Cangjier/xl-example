// xl:title 数组那一侧的面：构造 / 类数组接收者 / 洞的四种口径 / 复制与原地改
// xl:round 760
// xl:judge stdout
// xl:note 第 760 轮普查里**全过**的那一片，收进矩阵当守卫：`sort` 的比较器与洞、
// xl:note `slice` / `concat` / `Array.from` 对洞的四种口径（各不相同）、`splice` 的返回值、
// xl:note `copyWithin` / `with` / `flat` / `flatMap` / `at` / `entries`、类数组接收者。
// xl:end
const show = (v: any) => JSON.stringify(v);
console.log("1", show([3, 1, 2].sort((a, b) => a - b)));
console.log("2", show([10, 9].sort()));
console.log("3", show([, 1].sort().length + ":" + (0 in [, 1].sort())));
console.log("4", show([undefined, 1, 2].sort()));
console.log("5", show([1, 2, 3].toSorted((a, b) => b - a)));
console.log("6", show([1, , 3].map((v) => v).length + ":" + (1 in [1, , 3].map((v) => v))));
console.log("7", show([1, , 3].filter(() => true).length));
console.log("8", show([1, , 3].slice().length + ":" + (1 in [1, , 3].slice())));
console.log("9", show([1, , 3].concat([4]).length + ":" + (1 in [1, , 3].concat([4]))));
console.log("10", show([...[, 1]].length + ":" + (0 in [...[, 1]])));
console.log("11", show(Array.from([1, , 3]).join(",")));
console.log("12", show([1, , 3].includes(undefined) + ":" + [1, , 3].indexOf(undefined)));
console.log("13", show(new Array(3).length + ":" + (0 in new Array(3))));
console.log("14", show(Array.from({ length: 3 }, (_, i) => i)));
console.log("15", show(Array.prototype.slice.call({ length: 2, 0: "a", 1: "b" })));
console.log("16", show(Array.prototype.join.call("abc", "-")));
console.log("17", show((function () { const a = [1, 2, 3]; return [a.splice(1, 1), a]; })()));
console.log("18", show((function () { const a = [1, 2, 3]; return [a.splice(1, 0, 9), a]; })()));
console.log("19", show([1, 2, 3, 4, 5].copyWithin(1, -2)));
console.log("20", show([1, 2, 3].with(-1, 9)));
console.log("21", show([1, [2, [3]]].flat(2) + ":" + [1, , 2].flatMap((v) => [v]).length));
console.log("22", show([1, 2, 3].at(-1) + ":" + [1, 2, 3].entries().next().value.join(",")));
