// xl:title 数组进模板串走的是 `toString`（即 `join`）
// xl:round 305
// xl:judge stdout
// xl:end

console.log("xs=" + [1, 2] + "!", `ys=${[3, 4]}`);
