// xl:title 回调里抛：外层 `try` 接得住，且 `finally` 照跑
// xl:judge stdout
// xl:end

let log = "";
try {
  [1, 2, 3].forEach((v: number) => { if (v === 2) throw new Error("cb" + v); log += v; });
} catch (e: any) {
  log += "|caught:" + e.message;
} finally {
  log += "|fin";
}
console.log(log);
