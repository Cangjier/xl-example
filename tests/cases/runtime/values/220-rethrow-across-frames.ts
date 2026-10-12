// xl:title 异常穿过三层调用栈后由最外层接住
// xl:round 623
// xl:judge stdout
// xl:end

function c() { throw new Error("deep"); }
function b() { c(); }
function a() { try { b(); } catch (e: any) { return "caught:" + e.message; } }
console.log(a());
