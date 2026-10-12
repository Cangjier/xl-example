// xl:title 异常穿帧：三层调用里抛出，栈中途的 finally 依次跑
// xl:round 7
// xl:judge stdout
// xl:end

function a() { try { b(); } finally { console.log("fin-a"); } }
function b() { try { c(); } finally { console.log("fin-b"); } }
function c() { throw new RangeError("deep"); }
try { a(); } catch (e) { console.log((e as Error).name, (e as Error).message); }
