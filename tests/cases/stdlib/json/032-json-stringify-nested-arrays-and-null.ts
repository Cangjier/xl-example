// xl:title `JSON.stringify` 的数组洞、null 与嵌套
// xl:round 331
// xl:judge stdout
// xl:end

console.log(JSON.stringify([1, null, undefined, 3]));
console.log(JSON.stringify({ a: [1, [2, [3]]], b: null }));
console.log(JSON.stringify(undefined), JSON.stringify(null), JSON.stringify(NaN));
