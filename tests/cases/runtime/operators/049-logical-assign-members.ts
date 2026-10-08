// xl:title 逻辑赋值 / 复合赋值的左值只求值一次
// xl:round 9
// xl:judge stdout
// xl:end

let calls = 0;
const o = { n: 1, s: "a" };
function k() { calls += 1; return "n"; }
o[k()] ??= 5;
o[k()] &&= 7;
o[k()] ||= 9;
console.log(o.n, calls);
let i = 0;
const arr = [10, 20];
arr[i++] += 1;
console.log(arr.join(","), i);
