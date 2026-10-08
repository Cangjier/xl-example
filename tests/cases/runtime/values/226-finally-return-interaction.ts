// xl:title finally 与 return 的相互覆盖：finally 里的 return 赢、无 return 时原值保留
// xl:round 7
// xl:judge stdout
// xl:end

function keep() { try { return "try"; } finally { console.log("f1"); } }
function override() { try { return "try"; } finally { return "finally"; } }
function lossy() { try { return "try"; } finally { console.log("f3"); return; } }
console.log(keep(), override(), lossy());
