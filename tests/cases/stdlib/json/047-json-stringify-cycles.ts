// xl:title JSON.stringify：循环引用抛 TypeError、深层嵌套照常
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
o.self = o;
try { JSON.stringify(o); } catch (e) { console.log("cycle:" + (e as Error).name); }
const deep = { a: { b: { c: { d: [1, 2, { e: null }] } } } };
console.log(JSON.stringify(deep), JSON.stringify([[1], [2]]));
