// fresh-build.mjs 的子进程一侧：从 stdin 读 { job, source, name }，按 job 跑一次 build/ts，写回 JSON。
//
// 只在子进程里 import 具体作业的实现：job 是 "actual" 时不去碰 gen-case-docs（它 import 时就会
// require build/ts），作业之间的依赖互不牵连。
//
// 成功 exit 0、stdout 一个 JSON；失败把原因写 stderr、exit 1——父进程据此抛错，不静默降级。
import fs from "node:fs";

const request = JSON.parse(fs.readFileSync(0, "utf8"));
const job = String(request.job ?? "");

if (job === "actual") {
  const { traceActualInProcess } = await import("./shape-actual.mjs");
  const result = traceActualInProcess(request.source, request.name);
  process.stdout.write(JSON.stringify({
    map: Array.from(result.map),
    created: Array.from(result.created),
    final: result.final,
  }));
} else if (job === "steps") {
  const { traceSteps } = await import("./gen-case-docs.mjs");
  process.stdout.write(JSON.stringify({ steps: traceSteps(request.source, request.name) }));
} else if (job === "markdown") {
  const { renderMarkdown } = await import("./gen-case-docs.mjs");
  process.stdout.write(JSON.stringify({ markdown: renderMarkdown(request.source, request.name) }));
} else {
  throw new Error(`fresh-build-child: 未知 job ${JSON.stringify(job)}`);
}
