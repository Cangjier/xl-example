// xl:title try / catch 带类型标注 / finally 三件套齐活
// xl:judge stdout
// xl:end

function run(mode: string) {
  const log: string[] = [];
  try { log.push("try"); if (mode === "throw") throw new TypeError("t"); log.push("ok"); }
  catch (e: unknown) { log.push("catch:" + (e as Error).message); }
  finally { log.push("finally"); }
  return log.join("|");
}
console.log(run("throw"), run("fine"));
