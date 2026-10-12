// xl:title JSON.parse 的 reviver：自底向上、整棵树
// xl:round 323
// xl:judge stdout
// xl:end

const out = JSON.parse('{"a":{"b":1},"c":[2,3]}', (k, v) => (typeof v === "number" ? v * 10 : v));
console.log(JSON.stringify(out));
