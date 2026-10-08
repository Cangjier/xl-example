// xl:title 类字段上的箭头函数把 this 钉在实例上
// xl:round 682
// xl:judge stdout
// xl:end
class Counter2 { n = 0; bump = () => { this.n++; return this.n; }; m() { return this.n; } }
const cnt: any = new Counter2();
const detached: any = cnt.bump;
try { console.log("first", String(detached())); } catch (e) { console.log("first", "ERR", String(e && e.name)); }
try { console.log("second", String(cnt.bump())); } catch (e) { console.log("second", "ERR", String(e && e.name)); }
try { console.log("state", String(cnt.m())); } catch (e) { console.log("state", "ERR", String(e && e.name)); }
