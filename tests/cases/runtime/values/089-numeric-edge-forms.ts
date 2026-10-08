// xl:title 浮点与安全整数边界
// xl:round 291
// xl:judge stdout
// xl:end

console.log(0.1 + 0.2 === 0.3, Math.abs(0.1 + 0.2 - 0.3) < 1e-10);
console.log(Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
console.log(1 / 3, 2 ** 53, -(2 ** 53));
