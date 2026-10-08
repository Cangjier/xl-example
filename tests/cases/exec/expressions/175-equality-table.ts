// xl:title `==` 的转换表：`null` / `NaN` / 对象 / 布尔
// xl:round 691
// xl:judge stdout
// xl:end
console.log(null == undefined, null == 0, null == false);
console.log(NaN == NaN, 0 == false, "" == false, "0" == false);
console.log([] == false, [0] == false, [1] == true);
console.log(Object.is(NaN, NaN), Object.is(0, -0));
