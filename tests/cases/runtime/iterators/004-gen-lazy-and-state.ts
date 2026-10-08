// xl:title 生成器是惰性的：body 里的副作用只在推的时候发生
// xl:judge stdout
// xl:end

const log: string[] = [];
function* g(): any { log.push("start"); yield 1; log.push("mid"); yield 2; log.push("end"); }
const it = g();
console.log(log.length, it.next().value, log.join(","));
console.log(it.next().value, log.join(","));
console.log(it.next().done, log.join(","));
