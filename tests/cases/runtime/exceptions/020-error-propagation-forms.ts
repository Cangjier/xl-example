// xl:title 错误的包装与 cause 的传播
// xl:round 291
// xl:judge stdout
// xl:end

function inner() { throw new RangeError("deep"); }
function outer() { try { inner(); } catch (e) { throw new Error("wrapped", { cause: e }); } }
try { outer(); } catch (e: any) { console.log(e.message, e.cause.message); }
