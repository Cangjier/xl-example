// xl:title Symbol：描述、注册表、作键、for-in 看不见
// xl:round 9
// xl:judge stdout
// xl:end

const s = Symbol("k");
const o: any = { [s]: 1, plain: 2 };
console.log(s.description, typeof s, Object.keys(o).join(","));
console.log(Symbol.for("x") === Symbol.for("x"), Symbol.keyFor(Symbol.for("x")));
console.log(Object.getOwnPropertySymbols(o).length, o[s]);
