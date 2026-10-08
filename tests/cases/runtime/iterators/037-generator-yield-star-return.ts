// xl:title `yield*` 的透传与 `return()`
// xl:round 691
// xl:judge stdout
// xl:end
function* inner(): any { yield 1; yield 2; return "inner-return"; }
function* outer(): any {
  const got = yield* inner();
  console.log("got", got);
  yield 3;
}
console.log([...outer()].join(","));
