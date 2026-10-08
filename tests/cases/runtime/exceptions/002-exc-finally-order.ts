// xl:title try / catch / finally 的执行顺序（含没抛的那条路）
// xl:judge stdout
// xl:end

function run(shouldThrow: boolean): string {
  let log = "";
  try { log += "try"; if (shouldThrow) throw new Error("x"); log += "-ok"; }
  catch (e) { log += "-catch"; }
  finally { log += "-finally"; }
  return log;
}
console.log(run(false), run(true));
