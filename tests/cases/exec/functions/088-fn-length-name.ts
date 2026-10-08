// xl:title 函数的 length 与 name（用户写的那些）
// xl:round 682
// xl:judge stdout
// xl:end
function two(a: number, b: number) { return a + b; }
function def(a: number, b: number = 1, ...rest: number[]) { return a + b; }
const arrowed = (x: number, y: number, z: number) => x + y + z;
const obj2: any = { m(q: number) { return q; } };
try { console.log("two", String(two.length)); } catch (e) { console.log("two", "ERR", String(e && e.name)); }
try { console.log("with-default", String(def.length)); } catch (e) { console.log("with-default", "ERR", String(e && e.name)); }
try { console.log("arrow", String(arrowed.length)); } catch (e) { console.log("arrow", "ERR", String(e && e.name)); }
try { console.log("method", String(obj2.m.length)); } catch (e) { console.log("method", "ERR", String(e && e.name)); }
try { console.log("names", String([two.name, def.name, arrowed.name, obj2.m.name].join(','))); } catch (e) { console.log("names", "ERR", String(e && e.name)); }
