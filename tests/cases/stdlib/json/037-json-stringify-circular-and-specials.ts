// xl:title stringify：循环引用抛错、NaN / Infinity 成 null
// xl:round 371
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
o.self = o;
try { JSON.stringify(o); } catch (e) { console.log((e as Error).name); }
console.log(JSON.stringify({ n: NaN, i: Infinity, m: -Infinity }), JSON.stringify([NaN]));
console.log(JSON.stringify({ s: "\u2028\u2029" }));
