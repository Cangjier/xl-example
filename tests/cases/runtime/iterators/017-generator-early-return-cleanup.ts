// xl:title 提前结束生成器：return() 要跑 finally
// xl:round 323
// xl:judge stdout
// xl:end

function* g() { try { yield 1; yield 2; } finally { console.log("cleanup"); } }
const it = g();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.return(9)));
console.log(JSON.stringify(it.next()));
