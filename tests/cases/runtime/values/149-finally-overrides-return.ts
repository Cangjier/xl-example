// xl:title finally 里 return 覆盖 try 里的 return；finally 里 throw 覆盖一切
// xl:round 323
// xl:judge stdout
// xl:end

function a() { try { return 1; } finally { return 2; } }
function b() { try { return 1; } finally { console.log("cleanup"); } }
function c() { try { return 1; } finally { throw new Error("late"); } }
console.log(a(), b());
try { c(); } catch (e) { console.log((e as Error).message); }
