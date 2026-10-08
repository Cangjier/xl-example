// xl:title Array.of：与 new Array(n) 的区别
// xl:judge stdout
// xl:end

console.log(Array.of(3).length, Array.of(3)[0], new Array(3).length, new Array(3)[0]);
console.log(Array.of(1, 2, 3).join(","), Array.of().length);
