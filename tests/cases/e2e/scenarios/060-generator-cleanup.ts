// xl:title 生成器的收尾：`break` / `return` / `throw` 三条路都跑 `finally`
// xl:round 338
// xl:judge stdout
// xl:end

const log: string[] = [];
function* resource(tag: string) {
  log.push("open " + tag);
  try {
    yield 1;
    yield 2;
    yield 3;
  } finally {
    log.push("close " + tag);
  }
}
for (const v of resource("loop")) { if (v === 2) break; }
function takeFirst(): number {
  for (const v of resource("func")) return v;
  return -1;
}
console.log(takeFirst());
const it = resource("manual");
console.log(it.next().value);
console.log(JSON.stringify(it.return(7)));
try {
  const it2 = resource("throw");
  it2.next();
  it2.throw(new Error("boom"));
} catch (e) {
  log.push("caught " + (e as Error).message);
}
console.log(log.join(","));
