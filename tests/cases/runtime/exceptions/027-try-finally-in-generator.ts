// xl:title 生成器里的 `try` / `finally` 与提前结束
// xl:round 330
// xl:judge stdout
// xl:end

function* g(): Generator<number> {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log("cleanup in generator");
  }
}
const it = g();
console.log(it.next().value);
for (const v of it) console.log("loop", v);
