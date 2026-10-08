// xl:title 循环里连续 `await` 的次序
// xl:round 691
// xl:judge stdout
// xl:end
async function f(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await null;
    console.log("i", i);
  }
  console.log("done");
}
f();
console.log("sync");
