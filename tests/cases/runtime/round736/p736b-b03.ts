// xl:title `JSON.stringify` 的 `space`（数字 / 字符串 / 越界 / 负数）
// xl:round 736
// xl:judge stdout
// xl:end
console.log(JSON.stringify({ a: [1] }, null, 2));
console.log(JSON.stringify({ a: 1 }, null, "ab"));
console.log(JSON.stringify({ a: 1 }, null, 20).length);
console.log(JSON.stringify({ a: 1 }, null, -1), JSON.stringify({ a: 1 }, null, 0));
