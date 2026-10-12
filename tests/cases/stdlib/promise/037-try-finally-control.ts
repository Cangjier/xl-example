// xl:title try / catch / finally 里的 return / break / continue
// xl:round 623
// xl:judge stdout
// xl:end

function f() { try { return 1; } finally { console.log("fin"); } }
console.log(f());
for (let i = 0; i < 2; i++) { try { continue; } finally { console.log("loop-fin", i); } }
try { throw new Error("e"); } catch (e: any) { console.log("caught", e.message); } finally { console.log("end"); }
