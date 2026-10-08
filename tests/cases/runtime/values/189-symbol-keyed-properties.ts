// xl:title 符号键：不参与枚举 / JSON / for..in，但参与取值
// xl:round 371
// xl:judge stdout
// xl:end
const s1 = Symbol("a");
const s2 = Symbol.for("b");
const o: any = { plain: 1, [s1]: 2, [s2]: 3, [Symbol.iterator]: function* () { yield 9; } };
console.log(o[s1], o[s2], o.plain, Object.keys(o).join(","), JSON.stringify(o));
for (const k in o) console.log("in", k);
console.log([...o].join(","), Object.getOwnPropertySymbols(o).length);
