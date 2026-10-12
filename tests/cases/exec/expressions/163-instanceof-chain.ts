// xl:title instanceof 的原型链与 Symbol.hasInstance 无关的一半
// xl:round 681
// xl:judge stdout
// xl:end
class A {} class B extends A {} class C extends B {}
const o: any = new C();
try { console.log("A", String(o instanceof A)); } catch (e) { console.log("A", "ERR", String(e && e.name)); }
try { console.log("B", String(o instanceof B)); } catch (e) { console.log("B", "ERR", String(e && e.name)); }
try { console.log("fn", String((() => { function F() {} const f: any = new (F as any)(); return f instanceof F; })())); } catch (e) { console.log("fn", "ERR", String(e && e.name)); }
try { console.log("arrow", String((() => { try { return String((() => {}) instanceof Function); } catch (e: any) { return 'ERR ' + String(e.name); } })())); } catch (e) { console.log("arrow", "ERR", String(e && e.name)); }
