// xl:title 异步生成器里 `for await` 的顺序与 `return()`
// xl:round 8
// xl:judge stdout
// xl:end

async function* gen() {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve(i);
    yield i;
  }
  return "done";
}
async function main() {
  for await (const v of gen()) console.log(v);
  const it = gen();
  console.log((await it.next()).value, (await it.return("x")).value);
}
main();
