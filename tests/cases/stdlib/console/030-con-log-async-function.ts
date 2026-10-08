// xl:title 异步函数与生成器函数的渲染那一档
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why `[AsyncFunction: g]` / `[GeneratorFunction: f]` 这一档要闭包上再盖一位
//       （第 613 轮的 `IsClass` 是同一形状的先例），本仓的闭包只有 `IsClass` 一位。要做。
// xl:end
console.log(function* gen() {});
console.log(async function g() {});
console.log({ a: async () => 1 });
