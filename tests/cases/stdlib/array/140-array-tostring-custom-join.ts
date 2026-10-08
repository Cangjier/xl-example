// xl:title 数组的 `toString` 走 `join`，改了 `join` 就跟着改
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, 2];
console.log(String(a), a + "");
a.join = function () { return "J"; };
console.log(String(a), a + "");
