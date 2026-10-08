// xl:title `async` 里的 `throw` 与 `await` 一个被拒的承诺
// xl:round 691
// xl:judge stdout
// xl:end
async function f(): Promise<void> {
  try {
    await Promise.reject(new RangeError("bad"));
  } catch (e: any) {
    console.log("caught", e.name, e.message);
  }
  console.log("after");
}
f();
console.log("sync");
