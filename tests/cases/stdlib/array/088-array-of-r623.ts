// xl:title Array.of 与构造器单数字参数的分野
// xl:round 623
// xl:judge stdout
// xl:end

console.log(Array.of(3).length, Array.of(3).join(","), new Array(3).length);
console.log(Array.of(1, 2).join(","), Array.isArray([]), Array.isArray("x"));
