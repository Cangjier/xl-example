// xl:title 符号转字符串该抛
// xl:round 691
// xl:judge stdout
// xl:end
const s: any = Symbol("x");
try { console.log("" + s); } catch (e: any) { console.log("throw", e.constructor.name); }
try { console.log(`${s}`); } catch (e: any) { console.log("tmpl", e.constructor.name); }
console.log(String(s));
