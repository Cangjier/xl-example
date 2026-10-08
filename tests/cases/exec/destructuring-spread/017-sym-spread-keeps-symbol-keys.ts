// xl:title 展开与 assign 对 symbol 键的取舍
// xl:round 678
// xl:judge stdout
// xl:end

const s = Symbol("k");
const src: any = { a: 1, [s]: 2 };
const spread: any = { ...src };
const assigned: any = Object.assign({}, src);
console.log(spread.a, spread[s]);
console.log(assigned.a, assigned[s]);
