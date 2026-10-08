// xl:title super 的三种落点：构造、方法、访问器（再走一遍带实参的）
// xl:round 683
// xl:judge stdout
// xl:end
class B { v: number; constructor(v: number) { this.v = v; } m(x: number): number { return this.v + x; } get g(): number { return this.v * 2; } }
class S extends B { constructor(...args: number[]) { super(args[0] + 1); } m(x: number): number { return super.m(x) + 1; } get g(): number { return super.g + 1; } }
const s: any = new S(1);
try { console.log("ctor-args", String(s.v)); } catch (e) { console.log("ctor-args", "ERR", String(e && e.name)); }
try { console.log("method-super", String(s.m(2))); } catch (e) { console.log("method-super", "ERR", String(e && e.name)); }
try { console.log("getter-super", String(s.g)); } catch (e) { console.log("getter-super", "ERR", String(e && e.name)); }
try { console.log("super-in-static", String((() => { class A { static k() { return 'A'; } } class B2 extends A { static k() { return 'B' + super.k(); } } return B2.k(); })())); } catch (e) { console.log("super-in-static", "ERR", String(e && e.name)); }
