// xl:title 比较与相等：`==` 的七种组合与 `Object.is`
// xl:round 750
// xl:judge stdout
// xl:end
console.log(null == undefined, null === undefined, null == 0, undefined == 0);
console.log("1" == 1, "1" === 1, true == 1, false == "", "" == 0);
console.log([] == "", [0] == 0, [1, 2] == "1,2", ({} as any) == "[object Object]");
console.log(NaN == NaN, Object.is(NaN, NaN), 0 == -0, Object.is(0, -0));
console.log("a" < "b", "10" < "9", 10 < 9, [2] > [1]);
console.log(null >= 0, null > 0, undefined < 1);
