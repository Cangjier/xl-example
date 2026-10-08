// xl:title 原型上的方法摘出来之后 this 是调用者
// xl:round 682
// xl:judge stdout
// xl:end
class P2 { v = 5; read(this: any) { return this === undefined ? 'no-this' : this.v; } }
const inst: any = new P2();
const protoFn: any = P2.prototype.read;
try { console.log("via-instance", String(inst.read())); } catch (e) { console.log("via-instance", "ERR", String(e && e.name)); }
try { console.log("via-prototype", String((() => { try { return String(protoFn()); } catch (e: any) { return 'ERR ' + String(e.name); } })())); } catch (e) { console.log("via-prototype", "ERR", String(e && e.name)); }
try { console.log("call-with-instance", String(protoFn.call(inst))); } catch (e) { console.log("call-with-instance", "ERR", String(e && e.name)); }
