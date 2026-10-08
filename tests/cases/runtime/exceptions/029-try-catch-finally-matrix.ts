// xl:title try / catch / finally 的六种收口方式
// xl:round 371
// xl:judge stdout
// xl:end
function a(): string { try { return "t"; } finally { console.log("f1"); } }
function b(): string { try { throw new Error("x"); } catch { return "c"; } finally { console.log("f2"); } }
function c(): string { try { return "t"; } finally { return "f"; } }
function d(): string { try { throw new Error("x"); } finally { return "f"; } }
function e(): string { try { return "t"; } catch { return "c"; } }
function g(): string { let out = ""; try { out += "t"; } finally { out += "f"; } return out; }
console.log(a(), b(), c(), d(), e(), g());
try { try { throw new Error("inner"); } finally { console.log("f3"); } } catch (err) { console.log("outer", (err as Error).message); }
