// xl:title 数字边界：`NaN` / `Infinity` / `-0` 的渲染与比较
// xl:round 750
// xl:judge stdout
// xl:end
console.log(NaN, Infinity, -Infinity, -0, 1 / 0, -1 / 0);
console.log(String(-0), (-0).toString(), JSON.stringify(-0), JSON.stringify([-0]));
console.log(-0 === 0, Object.is(-0, 0), [0].indexOf(-0), [-0].includes(0));
console.log(NaN === NaN, [NaN].indexOf(NaN), [NaN].includes(NaN));
console.log(Number.isNaN("NaN" as any), isNaN("NaN" as any), Number.isNaN(undefined as any));
console.log(Math.max(NaN, 1), Math.min(0, -0), 0 / 0, 1 % 0);
console.log((0.1 + 0.2).toString(), (1e21).toString(), (1e-7).toString());
