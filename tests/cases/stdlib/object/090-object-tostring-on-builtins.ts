// xl:title 内建对象的 toString 与 valueOf 的组合
// xl:round 371
// xl:judge stdout
// xl:end
console.log(String([]), String([1, 2]), String([null, 1]), String({}));
console.log([1, 2] + "", [] + 1, [5] * 2);
console.log(String(new Map()), String(new Set()), String(new Date(0)).length > 0);
console.log(String(new Error("e")), String(new TypeError("t")));
