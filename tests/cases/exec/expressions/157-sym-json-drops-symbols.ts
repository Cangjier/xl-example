// xl:title JSON.stringify 丢掉 symbol 键与 symbol 值
// xl:round 678
// xl:judge stdout
// xl:end

const s = Symbol("k");
const o: any = { a: 1, [s]: 2, b: undefined, c: () => 1 };
console.log(JSON.stringify(o));
console.log(JSON.stringify({ x: [1, undefined, () => 1] }));
console.log(JSON.stringify(s));
