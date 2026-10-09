// xl:title 数字 → 文本：`String()` / `toString()` / `JSON.stringify` 三方一致，含 `-0` / 极值 / 非有限值
// xl:round 747
// xl:judge stdout
// xl:want pass
// xl:end

const nums = [0, -0, 1, -1, 0.1, 1e21, 1e-7, NaN, Infinity, -Infinity];
for (const n of nums) console.log(String(n), n.toString(), JSON.stringify(String(n)));
console.log((255).toString(16), (0.5).toString(2));
console.log(JSON.stringify(0.1 + 0.2), String(0.1 + 0.2));
console.log((1e21).toString(), (1e-7).toString(), (-0).toString());
console.log(JSON.stringify(-0), JSON.stringify(NaN), JSON.stringify(Infinity));
