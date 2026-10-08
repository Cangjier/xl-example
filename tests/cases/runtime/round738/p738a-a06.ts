// xl:title `yield` 与逻辑链的**求值次序**（短路要从左到右）
// xl:round 738
// xl:judge stdout
// xl:end
const log: string[] = [];
function side(tag: string, value: any) { log.push(tag); return value; }
function* g() { const v = yield side("l", 1) && side("r", 2); return v; }
const it = g();
console.log(side("left", 0) && side("never", 1));
console.log(JSON.stringify(it.next()), JSON.stringify(it.next(9)));
console.log(log.join(","));
