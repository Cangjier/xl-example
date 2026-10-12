// xl:title finally 里抛：盖过 try 里的 return
// xl:judge stdout
// xl:end

function f() {
  try { return "try"; } finally { throw new Error("boom"); }
}
try { f(); } catch (e: any) { console.log("caught", e.message); }
