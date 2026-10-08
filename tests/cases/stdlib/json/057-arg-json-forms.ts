// xl:title 参数位：JSON.stringify 的 space / replacer / toJSON 与 reviver
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("space", String(JSON.stringify({ a: 1, b: [2] }, null, 2))); } catch (e) { console.log("space", "ERR", String(e && e.name)); }
try { console.log("replacer-array", String(JSON.stringify({ a: 1, b: 2 }, ['a']))); } catch (e) { console.log("replacer-array", "ERR", String(e && e.name)); }
try { console.log("replacer-fn", String(JSON.stringify({ a: 1, b: 2 }, (k: any, v: any) => (k === 'b' ? undefined : v)))); } catch (e) { console.log("replacer-fn", "ERR", String(e && e.name)); }
try { console.log("toJSON", String(JSON.stringify({ d: new Date(0) }))); } catch (e) { console.log("toJSON", "ERR", String(e && e.name)); }
try { console.log("reviver-drop", String(JSON.stringify(JSON.parse('{"a":1,"b":2}', (k: any, v: any) => (k === 'b' ? undefined : v))))); } catch (e) { console.log("reviver-drop", "ERR", String(e && e.name)); }
try { console.log("parse-order", String(JSON.parse('{"a":{"b":1}}', (k: any, v: any) => (k === 'b' ? v + 1 : v)).a.b)); } catch (e) { console.log("parse-order", "ERR", String(e && e.name)); }
