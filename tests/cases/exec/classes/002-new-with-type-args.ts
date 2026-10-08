// xl:title `new` 上的类型实参：`new Map<string, number>()`
// xl:judge stdout
// xl:end

const m = new Map<string, number>([["a", 1]]);
const xs = new Array<number>(3);
console.log(m.get("a"), xs.length, new Set<string>(["x"]).size);
