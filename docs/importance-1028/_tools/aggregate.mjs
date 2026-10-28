// 全局机械读数：为 00-overview 与 99-summary 提供可复算的计数
import fs from "node:fs";

const recs = JSON.parse(fs.readFileSync("tmp/importance-facts.json", "utf8"));
const n = recs.length;
const sum = (f) => recs.reduce((a, r) => a + (f(r) || 0), 0);
const filesWhere = (f) => recs.filter(f).length;

const rows = [
  ["文件总数", n],
  ["总字节", sum((r) => r.bytes)],
  ["总代码行", sum((r) => r.codeLines)],
  ["shape 类文件", filesWhere((r) => r.flags.isShapeFile)],
  ["覆盖 ExitOrPre 的文件", filesWhere((r) => r.flags.exitOrPreOverride > 0)],
  ["覆盖 ComputePossibleShapes 的文件", filesWhere((r) => r.flags.computePossibleShapesOverride > 0)],
  ["覆盖 Process 的文件", filesWhere((r) => r.flags.processOverride > 0)],
  ["覆盖 Close 的文件", filesWhere((r) => r.flags.closeOverride > 0)],
  ["TryToClose 调用点", sum((r) => r.flags.tryToCloseCalls)],
  ["SignOut 调用点", sum((r) => r.flags.signOutCalls)],
  ["MountedUnit 赋值点", sum((r) => r.flags.mountedAssign)],
  ["Reclose 调用点", sum((r) => r.flags.recloseCalls)],
  ["ReloadMessage 引用点", sum((r) => r.flags.reloadRefs)],
  ["catch 总数", sum((r) => r.flags.catchTotal)],
  ["compute/build 内 catch 的文件", filesWhere((r) => r.flags.catchInPossible + r.flags.catchInBuild > 0)],
  ["compute 内 catch 次数", sum((r) => r.flags.catchInPossible)],
  ["build 内 catch 次数", sum((r) => r.flags.catchInBuild)],
  ["compute 里有循环的文件", filesWhere((r) => r.flags.loopInPossible > 0)],
  ["compute 里循环总数", sum((r) => r.flags.loopInPossible)],
  ["build 里有循环的文件", filesWhere((r) => r.flags.loopInBuild > 0)],
  ["compute 里看 tokenIndex+N 的文件", filesWhere((r) => r.flags.lookahead.length > 0)],
  ["GetState 调用点", sum((r) => r.flags.cacheStateGet)],
  ["SetState 调用点", sum((r) => r.flags.cacheStateSet)],
  ["GetShare 调用点", sum((r) => r.flags.cacheShareGet)],
  ["SetShare 调用点", sum((r) => r.flags.cacheShareSet)],
  ["用 cache 的文件", filesWhere((r) => r.flags.cacheStateGet + r.flags.cacheShareGet > 0)],
  ["HandleCloseDispatch 引用", sum((r) => r.flags.handleCloseDispatch)],
  ["EndPossible 引用", sum((r) => r.flags.endPossibleRefs)],
  ["Candidates 引用", sum((r) => r.flags.candidatesRefs)],
  ["ParseFromShape 引用", sum((r) => r.flags.parseFromShape)],
  ["Scan* 调用点", sum((r) => r.flags.scannerCalls)],
  ["BuildStatement 调用点", sum((r) => r.flags.buildStatementRefs)],
  ["Data.splice 点", sum((r) => r.flags.dataSplice)],
  ["Data = ...filter 点", sum((r) => r.flags.dataFilter)],
  ["Data.length = 0 点", sum((r) => r.flags.dataLengthZero)],
  ["MoveDataTo 点", sum((r) => r.flags.moveDataTo)],
  ["RemoveSelf 点", sum((r) => r.flags.removeSelf)],
  ["Jsx/JSX 引用点", sum((r) => r.flags.jsxRefs)],
  ["legacy 引用点", sum((r) => r.flags.legacyRefs)],
  ["GetRaw 调用点", sum((r) => r.flags.rawSliceRefs)],
  ["散文文件", filesWhere((r) => r.proseLines > 0)],
];
for (const [k, v] of rows) console.log(String(k).padEnd(32), v);

// 重点清单
const list = (name, f) => {
  const hits = recs.filter(f).map((r) => r.file);
  console.log(`\n## ${name} (${hits.length})`);
  for (const h of hits) console.log("  " + h);
};
list("覆盖 ExitOrPre", (r) => r.flags.exitOrPreOverride > 0);
list("覆盖 ComputePossibleShapes", (r) => r.flags.computePossibleShapesOverride > 0);
list("compute/build 内 catch", (r) => r.flags.catchInPossible + r.flags.catchInBuild > 0);
list("ParseFromShape 出现", (r) => r.flags.parseFromShape > 0);
list("EndPossible 出现", (r) => r.flags.endPossibleRefs > 0);
