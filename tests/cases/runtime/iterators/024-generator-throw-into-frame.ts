// xl:title 生成器：throw() 把异常送进挂起的 yield，被 try 接住后还能继续 yield
// xl:round 7
// xl:judge stdout
// xl:end

function* g() {
  for (let i = 0; i < 3; i++) {
    try { yield i; } catch (e) { console.log("caught:" + (e as Error).message); }
  }
  return "done";
}
const it = g();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.throw(new Error("boom"))));
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next()));
