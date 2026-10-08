// xl:title 闭包链：四层捕获各改各的
// xl:round 681
// xl:judge stdout
// xl:end
function outer() { let a = 1; return function () { let b = 2; return function () { let c = 3; return function () { return a + b + c; }; }; }; }
try { console.log("deep", String(outer()()()())); } catch (e) { console.log("deep", "ERR", String(e && e.name)); }
