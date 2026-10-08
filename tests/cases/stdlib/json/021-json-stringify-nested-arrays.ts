// xl:title JSON.stringify 的嵌套数组与空容器
// xl:round 304
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ a: [[1, 2], [], [null]], b: {}, c: [] }));
console.log(JSON.stringify([1, [2, [3, [4]]]]));
