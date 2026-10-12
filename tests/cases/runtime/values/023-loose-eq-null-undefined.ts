// xl:title `==` 的强制转换表：null / undefined / 空串 / 数组
// xl:judge stdout
// xl:end

console.log(null == undefined, null === undefined, null == 0, undefined == 0);
console.log("" == 0, "1" == 1, "  " == 0, [] == false, [1] == 1, [1, 2] == "1,2");
console.log(NaN == NaN, NaN === NaN);
