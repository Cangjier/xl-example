// xl:title switch：default 在中间且落空到下一个 case
// xl:round 681
// xl:judge stdout
// xl:end
function w(x: number): string { let s = ''; switch (x) { case 1: s += 'one'; default: s += 'def'; case 2: s += 'two'; break; case 3: s += 'three'; } return s; }
try { console.log("case1", String(w(1))); } catch (e) { console.log("case1", "ERR", String(e && e.name)); }
try { console.log("case2", String(w(2))); } catch (e) { console.log("case2", "ERR", String(e && e.name)); }
try { console.log("case9", String(w(9))); } catch (e) { console.log("case9", "ERR", String(e && e.name)); }
try { console.log("case3", String(w(3))); } catch (e) { console.log("case3", "ERR", String(e && e.name)); }
