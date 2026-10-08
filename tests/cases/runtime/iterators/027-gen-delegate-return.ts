// xl:title yield* 的返回值与 finally 的执行顺序
// xl:round 8
// xl:judge stdout
// xl:end

function* inner() {
  try { yield 1; return "r"; } finally { console.log("inner-finally"); }
}
function* outer() {
  const got = yield* inner();
  console.log("got", got);
  yield 2;
}
for (const v of outer()) console.log("v", v);
