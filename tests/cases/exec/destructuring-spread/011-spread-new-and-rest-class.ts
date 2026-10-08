// xl:title new 的展开实参 + rest 形参进类字段
// xl:round 8
// xl:judge stdout
// xl:end

class P { constructor(...parts) { this.parts = parts; } sum() { return this.parts.reduce((a, b) => a + b, 0); } }
const args = [1, 2, 3];
console.log(new P(...args).sum(), new P(4, ...[5, 6]).sum());
