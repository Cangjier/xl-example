// xl:title `new.target` 在函数与类里的值
// xl:round 683
// xl:judge stdout
// xl:end
function F(this: any) { return String(new.target === F); }
class C { tag: string; constructor() { this.tag = new.target === C ? 'C' : 'sub'; } }
class D extends C { constructor() { super(); this.tag += '+D'; } }
try { console.log("plain-call", String((() => { const f: any = F; return String(f()); })())); } catch (e) { console.log("plain-call", "ERR", String(e && e.name)); }
try { console.log("new-call", String(String(new (F as any)()))); } catch (e) { console.log("new-call", "ERR", String(e && e.name)); }
try { console.log("class", String(new C().tag)); } catch (e) { console.log("class", "ERR", String(e && e.name)); }
try { console.log("subclass", String(new D().tag)); } catch (e) { console.log("subclass", "ERR", String(e && e.name)); }
