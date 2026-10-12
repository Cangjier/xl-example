// xl:title 四条关系：两边都是串才按串比，否则走 ToNumber
// xl:judge stdout
// xl:end

console.log("10" < 9, 10 < "9", true < 2, null < 1, undefined < 1);
console.log("b" > "a", "2" < "10", 1 <= 1, 2 >= 3);
