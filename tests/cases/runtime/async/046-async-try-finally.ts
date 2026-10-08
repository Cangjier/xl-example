// xl:title `async` 里的 `try` / `finally` 与 `await` 的次序
// xl:round 691
// xl:judge stdout
// xl:end
async function f(): Promise<number> {
  try {
    await null;
    console.log("try");
    return 1;
  } finally {
    console.log("finally");
  }
}
f().then((v: number) => console.log("v", v));
console.log("sync");
