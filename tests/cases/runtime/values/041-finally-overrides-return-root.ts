// xl:title finally 里有 return：盖过 try / catch 的返回值
// xl:judge stdout
// xl:end

function a() { try { return 1; } finally { return 2; } }
function b() { try { throw new Error("x"); } catch { return 3; } finally { return 4; } }
console.log(a(), b());
