// xl:title parse：空白、原始值、重复键、__proto__ 键
// xl:round 371
// xl:judge stdout
// xl:end
console.log(JSON.parse("  { \"a\" : 1 }  ").a);
console.log(JSON.parse("null"), JSON.parse("true"), JSON.parse("1"), JSON.parse("\"s\""));
console.log(JSON.stringify(JSON.parse('{"a":1,"a":2}')));
const p = JSON.parse('{"__proto__":{"x":1}}') as any;
console.log(p.x, Object.getPrototypeOf(p) === Object.prototype);
try { JSON.parse("{a:1}"); } catch (e) { console.log((e as Error).name); }
