// xl:title `Object.entries` / `assign` / 展开在数组与访问器上的落点
// xl:round 750
// xl:judge stdout
// xl:end
const a: any = [1, 2];
console.log(JSON.stringify(Object.entries(a)), JSON.stringify(Object.assign({}, a)));
console.log(JSON.stringify({ ...a }), JSON.stringify(Object.keys(a)));
const o: any = { get g() { return 1; } };
console.log(JSON.stringify(Object.assign({}, o)), JSON.stringify({ ...o }));
const paired: any = [["x", 1]];
console.log(JSON.stringify(Object.fromEntries(paired)));
console.log(JSON.stringify(Object.assign([1, 2], [3])), Object.assign([1, 2], [3]).length);
