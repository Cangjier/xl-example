// xl:title 生成器对象的身份与原型
// xl:round 683
// xl:judge stdout
// xl:end
function* g() { yield 1; }
const it: any = g();
try { console.log("typeof", String(typeof it)); } catch (e) { console.log("typeof", "ERR", String(e && e.name)); }
try { console.log("has-next", String(typeof it.next)); } catch (e) { console.log("has-next", "ERR", String(e && e.name)); }
try { console.log("has-return", String(typeof it.return)); } catch (e) { console.log("has-return", "ERR", String(e && e.name)); }
try { console.log("has-throw", String(typeof it.throw)); } catch (e) { console.log("has-throw", "ERR", String(e && e.name)); }
try { console.log("symbol-iterator", String(typeof it[Symbol.iterator])); } catch (e) { console.log("symbol-iterator", "ERR", String(e && e.name)); }
try { console.log("self-iterable", String(it[Symbol.iterator]() === it)); } catch (e) { console.log("self-iterable", "ERR", String(e && e.name)); }
