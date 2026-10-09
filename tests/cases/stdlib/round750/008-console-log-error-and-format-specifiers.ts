// xl:title `console` 的 `log` / `error` 两条流与格式说明符的边界
// xl:round 750
// xl:judge stdout
// xl:end
console.log("%s", 1);
console.log("%d", "42");
console.log("%i", "42.9");
console.log("%o", { a: 1 });
console.log("%%");
console.log("a%sb", "x", "y");
console.error("E1", 2);
console.log(1, null, undefined, true, [1], { a: 1 });
console.log("str" + 1 + true + null + undefined);
