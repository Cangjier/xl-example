// xl:title 数字转文本的完整口径
// xl:round 371
// xl:judge stdout
// xl:end
const nums = [0, -0, 1, -1, 0.5, 1e21, 1e-7, 1e-6, NaN, Infinity, -Infinity, 123456789012345680000];
for (const n of nums) console.log(String(n));
console.log(String(0.1 + 0.2), String(1 / 3), (1234.5678).toFixed(2), (0.000001).toString());
console.log(`${1e21}`, `${1e-7}`, `${-0}`);
