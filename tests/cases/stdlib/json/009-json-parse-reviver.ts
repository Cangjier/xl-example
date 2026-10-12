// xl:title JSON.parse 的 reviver 与错误那一档
// xl:judge stdout
// xl:end

const o = JSON.parse('{"a":1,"b":{"c":2}}', (k, v) => (typeof v === "number" ? v * 10 : v));
console.log(JSON.stringify(o));
try { JSON.parse("{oops}"); } catch (e) { console.log("parse failed", e instanceof SyntaxError); }
console.log(JSON.parse("[1,2,3]").length, JSON.parse('"s"'), JSON.parse("null"));
