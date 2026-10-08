// xl:title getOwnPropertyDescriptor 取 symbol 键那一格
// xl:round 678
// xl:judge stdout
// xl:end

const s = Symbol("k");
const o: any = {};
Object.defineProperty(o, s, { value: 7, enumerable: true, writable: true, configurable: true });
const d: any = Object.getOwnPropertyDescriptor(o, s);
console.log(d.value, d.enumerable, d.writable, d.configurable);
console.log(o[s], Object.getOwnPropertySymbols(o).length);
