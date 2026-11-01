// 临时兼容垫片：长驻的 DSH 插件宿主里还缓存着旧版 shape-actual.mjs，
// 它按 "shape-actual-child.mjs" 这个名字起子进程。当前仓库已改名为 fresh-build-child.mjs，
// 所以这里把旧名字接回同一份 traceActualInProcess。宿主重启后即可删除本文件。
import fs from "node:fs";
import { traceActualInProcess } from "./shape-actual.mjs";

const request = JSON.parse(fs.readFileSync(0, "utf8"));
const result = traceActualInProcess(request.source, request.name);
process.stdout.write(JSON.stringify({
  map: Array.from(result.map),
  created: Array.from(result.created),
  final: result.final,
}));
