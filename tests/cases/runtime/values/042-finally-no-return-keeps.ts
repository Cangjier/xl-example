// xl:title finally 只跑副作用、没有 return：原返回值不变
// xl:judge stdout
// xl:end

const log: string[] = [];
function f() { try { log.push("t"); return "v"; } finally { log.push("f"); } }
console.log(f(), log.join(","));
