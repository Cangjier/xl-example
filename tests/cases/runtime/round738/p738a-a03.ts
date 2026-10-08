// xl:title `return` / `throw` 后面跟逻辑运算符
// xl:round 738
// xl:judge stdout
// xl:end
function f(x: any) { return x && 1; }
console.log(f(1), f(0));
function g(x: any) { throw x || new Error("m"); }
try { g(0); } catch (e: any) { console.log("caught", e.message); }
try { g(new TypeError("t")); } catch (e: any) { console.log("caught", e.constructor.name); }
