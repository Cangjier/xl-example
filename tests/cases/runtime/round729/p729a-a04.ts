// xl:title 可选链 + 非空断言（成员那一格的两个位置都对）
// xl:round 729
// xl:judge stdout
// xl:end
const o: any = { m() { return 7; }, n: { k: 1 } };
console.log(o?.n!.k, o?.n!.k!);
console.log(o.m!(), o.n!.k);
