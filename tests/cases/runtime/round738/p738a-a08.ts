// xl:title `??` 与 `||` 并排（不许混用要加括号那一条）
// xl:round 738
// xl:judge stdout
// xl:end
const a: any = 0;
const b: any = null;
console.log((a ?? 1) || 2, a || (b ?? 3), (b ?? 0) && 4);
console.log(a ?? (b || 9), (a && b) ?? 7);
