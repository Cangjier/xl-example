// xl:title `JSON`：非法输入、循环、`undefined` 成员
// xl:round 748
// xl:judge stdout
// xl:end
try { JSON.parse("{bad}"); } catch (e) { console.log("parse err", (e as Error).constructor.name, (e as Error).message.length > 0); }
console.log(JSON.stringify({ a: undefined, b: 1, c: NaN, d: Infinity }), JSON.stringify([undefined, function () {}]));
console.log(JSON.stringify(undefined), JSON.stringify(null), JSON.stringify("s"), JSON.stringify(1));
const cyc: any = {}; cyc.self = cyc;
try { JSON.stringify(cyc); } catch (e) { console.log("cycle", (e as Error).constructor.name); }
console.log(JSON.parse('{"a":1}', (k, v) => (k === "a" ? v + 1 : v)).a);
