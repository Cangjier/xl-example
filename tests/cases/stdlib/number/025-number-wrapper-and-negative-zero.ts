// xl:title Number 包装对象与 -0 的两条路
// xl:round 291
// xl:judge stdout
// xl:end

const n = new Number(5);
console.log(typeof n, n.valueOf(), n + 1, Number(n));
console.log(Object.is(-0, -0), Object.is(-0, 0), 1 / -0, String(-0));
