// xl:title var 提升与函数提升、arguments 的长度
// xl:round 681
// xl:judge stdout
// xl:end
function g(): string { try { return String(x); } catch (e: any) { return 'TDZ'; } }
function h(a: number, b: number): string { return a + ':' + arguments.length; }
function later() { return 1; }
var x: any = 1;
try { console.log("var-before", String(g())); } catch (e) { console.log("var-before", "ERR", String(e && e.name)); }
try { console.log("fn-hoist", String(later())); } catch (e) { console.log("fn-hoist", "ERR", String(e && e.name)); }
try { console.log("arguments", String(h(1, 2))); } catch (e) { console.log("arguments", "ERR", String(e && e.name)); }
