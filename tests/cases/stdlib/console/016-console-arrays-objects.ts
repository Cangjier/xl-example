// xl:title `console.log` 的数组与对象混排形状
// xl:round 330
// xl:judge stdout
// xl:end

console.log([], {}, [[]], [{}]);
console.log([1, "a", null, undefined, true]);
console.log({ a: [], b: {}, c: [[]] });
console.log([[1, 2], [3, 4]]);
