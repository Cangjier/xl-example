// xl:title `generator.throw()` 与生成器里的 `try` / `catch`
// xl:round 691
// xl:judge stdout
// xl:end
function* gen(): any {
  try {
    yield 1;
  } catch (e: any) {
    console.log("caught", e.message);
  }
  yield 2;
}
const it: any = gen();
console.log(it.next().value);
console.log(it.throw(new Error("boom")).value);
console.log(it.next().done);
