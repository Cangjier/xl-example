// xl:title 生成器：next 的 value/done、return、throw、委托
// xl:round 623
// xl:judge stdout
// xl:end

function* g() { yield 1; yield 2; return 3; }
const it = g();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
function* h() { yield* [1, 2]; yield 3; }
console.log([...h()].join(","));
function* k() { try { yield 1; } finally { console.log("fin"); } }
const i2 = k();
i2.next();
console.log(JSON.stringify(i2.return(9)));
