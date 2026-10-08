// xl:title JSON.stringify 的 replacer 数组与 toJSON
// xl:judge stdout
// xl:end

const o: any = { a: 1, b: 2, c: 3, d: { e: 4 } };
console.log(JSON.stringify(o, ["a", "c"]));
console.log(JSON.stringify({ when: new Date(0) }));
console.log(JSON.stringify({ n: NaN, u: undefined, f: () => 1, ok: 1 }));
