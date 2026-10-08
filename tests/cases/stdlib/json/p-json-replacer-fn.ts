// xl:title replacer 函数
// xl:round 692
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ a: 1, b: 2 }, (k, v) => (typeof v === "number" ? v * 2 : v)));
