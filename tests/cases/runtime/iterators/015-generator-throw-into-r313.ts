// xl:title 往生成器里 `throw`：体内接得住，没接住的那一抛连 `done` 一起收尾
// xl:round 313
// xl:judge stdout
// xl:end

function* g(): Generator<string, void, void> {
  try { yield "a"; } catch (e: any) { yield "caught:" + e.message; }
  yield "end";
}
const it: any = g();
console.log(it.next().value);
console.log(it.throw(new Error("in")).value);
console.log(it.next().value, it.next().done);
function* uncaught(): Generator<number, void, void> { yield 1; }
const u: any = uncaught();
console.log(u.next().value);
try { u.throw(new Error("boom")); console.log("no throw"); } catch (e: any) { console.log("caught outside", e.message); }
console.log(JSON.stringify(u.next()));
