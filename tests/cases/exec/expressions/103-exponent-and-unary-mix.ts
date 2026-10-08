// xl:title 一元与幂运算的结合：`-2 ** 2` 是语法错、`(-2) ** 2` 才对
// xl:round 7
// xl:judge stdout
// xl:end

console.log(2 ** 3 ** 2, (-2) ** 2, 2 ** -1, 2 ** 0);
let n = 2;
n **= 3;
console.log(n, typeof (2 ** 3), -(2 ** 2) + 10);
