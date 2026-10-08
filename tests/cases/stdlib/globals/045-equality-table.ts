// xl:title == 与 === 的类型转换表
// xl:round 623
// xl:judge stdout
// xl:end

console.log(null == undefined, null === undefined, 0 == "", 0 == false, "" == false);
console.log([] == false, [1] == 1, "1" == 1, NaN == NaN, Object.is(NaN, NaN));
