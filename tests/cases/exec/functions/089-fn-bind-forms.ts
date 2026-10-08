// xl:title bind 的偏应用与返回值身份
// xl:round 682
// xl:judge stdout
// xl:end
function add3(a: number, b: number, c: number) { return a + b + c; }
const step1: any = add3.bind(null, 1);
const step2: any = step1.bind(null, 2);
try { console.log("partial", String(step1(2, 3))); } catch (e) { console.log("partial", "ERR", String(e && e.name)); }
try { console.log("double-bind", String(step2(3))); } catch (e) { console.log("double-bind", "ERR", String(e && e.name)); }
try { console.log("bound-length", String(step1.length)); } catch (e) { console.log("bound-length", "ERR", String(e && e.name)); }
try { console.log("bound-name", String(step1.name)); } catch (e) { console.log("bound-name", "ERR", String(e && e.name)); }
try { console.log("this-ignored", String((() => { function who(this: any) { return this === undefined ? 'no-this' : 'bound'; } const b: any = who.bind({}); return b(); })())); } catch (e) { console.log("this-ignored", "ERR", String(e && e.name)); }
