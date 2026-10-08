// xl:title delete 一个 symbol 键，以及 delete 之后的 in
// xl:round 678
// xl:judge stdout
// xl:end

const s = Symbol("k");
const o: any = { [s]: 1, plain: 2 };
console.log(delete o[s], s in o);
console.log(delete o.plain, "plain" in o);
console.log(Object.getOwnPropertySymbols(o).length);
