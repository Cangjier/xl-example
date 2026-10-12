// xl:title 逗号表达式与一元运算的顺序
// xl:round 682
// xl:judge stdout
// xl:end
let log = '';
const seq = (log += 'a', log += 'b', 3);
try { console.log("sequence", String(seq + ':' + log)); } catch (e) { console.log("sequence", "ERR", String(e && e.name)); }
try { console.log("void", String(String(void 0))); } catch (e) { console.log("void", "ERR", String(e && e.name)); }
try { console.log("typeof-null", String(typeof null)); } catch (e) { console.log("typeof-null", "ERR", String(e && e.name)); }
try { console.log("typeof-undeclared", String(typeof notDefinedAnywhere)); } catch (e) { console.log("typeof-undeclared", "ERR", String(e && e.name)); }
try { console.log("double-negate", String(- -'5')); } catch (e) { console.log("double-negate", "ERR", String(e && e.name)); }
try { console.log("plus-plus-order", String((() => { let n = 1; const r = n++ + ++n; return r + ':' + n; })())); } catch (e) { console.log("plus-plus-order", "ERR", String(e && e.name)); }
