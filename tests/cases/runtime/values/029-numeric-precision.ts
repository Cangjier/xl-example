// xl:title 浮点的位与十进制往返
// xl:judge stdout
// xl:end

console.log(0.1 + 0.2, 0.1 + 0.2 === 0.3);
console.log(1 / 3, (1 / 3).toFixed(10), 1e21, 1e-7, 123456789012345678901234567890);
console.log(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
