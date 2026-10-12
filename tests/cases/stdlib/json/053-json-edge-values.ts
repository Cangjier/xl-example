// xl:title JSON：undefined / 函数 / 循环外的嵌套 / 解析报错
// xl:round 9
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ a: undefined, b: () => 1, c: [1, undefined] }));
console.log(JSON.stringify([undefined, null]));
console.log(JSON.stringify({ n: null, s: "x", t: true }));
try { JSON.parse("{oops}"); } catch (e) { console.log((e as Error).name); }
console.log(JSON.parse('{"a":[1,2]}').a.length);
