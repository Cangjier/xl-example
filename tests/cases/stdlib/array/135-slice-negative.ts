// xl:title `slice` 的负下标（数组与字符串）
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, 2, 3, 4, 5];
console.log(JSON.stringify(a.slice(-2)), JSON.stringify(a.slice(1, -1)), JSON.stringify(a.slice(3, 1)));
console.log("abcde".slice(-2), "abcde".slice(1, -1), "abcde".slice(3, 1));
