// xl:title 默认形参：后一个引用前一个，且按调用求值
// xl:round 681
// xl:judge stdout
// xl:end
let calls = 0;
function f(a: number, b: number = (calls++, a + 1)) { return a + ':' + b; }
try { console.log("first", String(f(1))); } catch (e) { console.log("first", "ERR", String(e && e.name)); }
try { console.log("calls", String(calls)); } catch (e) { console.log("calls", "ERR", String(e && e.name)); }
try { console.log("second", String(f(2, 5))); } catch (e) { console.log("second", "ERR", String(e && e.name)); }
try { console.log("calls-after", String(calls)); } catch (e) { console.log("calls-after", "ERR", String(e && e.name)); }
