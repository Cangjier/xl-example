// **增量形状档的预期清单与天花板——只写在这一处**（D7 波把增量形状翻成默认之后新加）。
//
// 为什么要有这个文件：同一份「5 条 lib 崩溃 + 87 差异 + 94 fallback」现在有**两把尺子**在读
// （`tests/parse/wide-ast.mjs` 与 `typescript/cases/real-dts-ast.mjs`）。两处各抄一份清单，
// 就是两处会漂；而漂了的症状正是「白名单悄悄多一条」——那正是 W4 / D5 §3 要防的事。
//
// ## 那 5 条为什么在清单上
// 全是外部 vendor `node_modules/typescript/lib/lib.*.d.ts`，每个文件有**两处**缺口
// （D5 §1.2：一处打首跳、一处打次跳，见 `_reports/W4.md` §7.2）。`SourceFileRunner.Parse`
// 的整文件兜底是 `ParseCore(shell=false)`，它也会走到第二处才失败 ⇒ 这几条**救不回来**，
// 只能登记成「已知缺口」。它们的 AST 在能建树时是对的（不在差异清单里）。
//
// ## 清单只许减，不许加
// - 只允许这 5 条 `lib.*.d.ts`：**任何一条非 lib 的崩溃、或换一个文件崩，都必须是红**
//   （`unexpectedCrashes` 的返回值非空 ⇒ 门 FAIL）。
// - 天花板是显式的：崩溃 5、差异 87、fallback 94（= 本仓库基线 78 + 白名单外部 16）。
// - legacy 档（`--legacy`）仍用老口径 0 / 0 / ≤2：它是复核用的对照尺，不是「放宽后的默认」。

/** 增量档允许崩溃的**全部**文件（相对仓库根，正斜杠）。 */
export const INCREMENTAL_CRASH_EXPECTED = [
  "node_modules/typescript/lib/lib.es2015.proxy.d.ts",
  "node_modules/typescript/lib/lib.es2017.object.d.ts",
  "node_modules/typescript/lib/lib.es2019.object.d.ts",
  "node_modules/typescript/lib/lib.es2024.sharedmemory.d.ts",
  "node_modules/typescript/lib/lib.esnext.typedarrays.d.ts",
];

/** 增量档（= 产品默认档）：三个显式天花板，不是「不计」。 */
export const INCREMENTAL_POLICY = {
  crashCeiling: INCREMENTAL_CRASH_EXPECTED.length,
  diffCeiling: 87,
  fallbackCeiling: 94,
};

/** legacy 档（`--legacy`）：D3e 实测的 0 / 0 / ≤2。 */
export const LEGACY_POLICY = {
  crashCeiling: 0,
  diffCeiling: 0,
  fallbackCeiling: 2,
};

/** 当前这一趟按哪一档判。 */
export function policyOf(incrementalOn) {
  return incrementalOn ? INCREMENTAL_POLICY : LEGACY_POLICY;
}

/**
 * 不在预期清单里的崩溃（legacy 档下**所有**崩溃都算意外，因为它的天花板是 0）。
 * 返回空数组 ⟺ 这一档允许崩溃的集合与实测集合**逐字**相等。
 */
export function unexpectedCrashes(labels, incrementalOn) {
  if (!incrementalOn) return labels.slice();
  return labels.filter((label) => !INCREMENTAL_CRASH_EXPECTED.includes(label));
}

/** 一句话把清单印成人能读的样子（门摘要里要带上它）。 */
export function expectedCrashList() {
  return INCREMENTAL_CRASH_EXPECTED.map((rel) => rel.slice(rel.lastIndexOf("/") + 1)).join(" / ");
}
