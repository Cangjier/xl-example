// xl:title 箭头函数的 this 跟着外层，不跟调用点
// xl:round 682
// xl:judge stdout
// xl:end
function make(): any { const self: any = { n: 3 }; self.arrow = () => (this === undefined ? 'no-this' : 'has-this'); return self; }
const box: any = { n: 4, f() { const g = () => this.n; return g(); } };
try { console.log("arrow-in-method", String(box.f())); } catch (e) { console.log("arrow-in-method", "ERR", String(e && e.name)); }
try { console.log("arrow-call-site", String((() => { const o: any = { n: 1, f() { const g = () => this.n; return g.call({ n: 99 }); } }; return o.f(); })())); } catch (e) { console.log("arrow-call-site", "ERR", String(e && e.name)); }
try { console.log("make-arrow", String(typeof make().arrow())); } catch (e) { console.log("make-arrow", "ERR", String(e && e.name)); }
