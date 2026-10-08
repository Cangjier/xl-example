// xl:title `await` 与 `try` / `finally` 的次序
// xl:round 330
// xl:judge stdout
// xl:end

async function run(): Promise<void> {
  const log: string[] = [];
  try {
    log.push("try");
    await null;
    throw new Error("x");
  } catch (e) {
    log.push("catch");
  } finally {
    log.push("finally");
  }
  log.push("after");
  console.log(log.join(","));
}
run();
