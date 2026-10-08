// xl:title `console.log` 的渲染：多实参 / 嵌套 / 换行 / 洞
// xl:round 747
// xl:judge stdout
// xl:end
console.log(1, "a", true, null, undefined);
console.log([1, [2, [3, [4]]]]);
console.log({ a: 1, b: { c: [1, 2] } });
console.log("a\nb");
console.log();
console.log([, 1], [undefined, 1]);
console.log("x".repeat(3), "y".length);
console.log(new Map([["k", 1]]).size);
