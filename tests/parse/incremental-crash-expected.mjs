// 增量档的预期清单与天花板——只写在这一处（D7 波把增量形状翻成默认之后新加）。
//
// D7 时这份清单是 5 条外部 vendor lib.*.d.ts。F6 收尾实测：那 5 条**不再崩溃**
// （wide-ast 与 real-dts 两把尺子都是 0 崩溃），因此清单**已清空**。清空之后
// unexpectedCrashes 对任何崩溃都返回非空 ⇒ 任何一条崩溃都是红。
//
// 当前读数（语料 1945，dist/ts 已剔除）：崩溃 0、差异 33、fallback 85（+ 白名单外部 13 = 98）。
// legacy 档（--legacy）仍是 0 / 0 / ≤2：它是复核用的对照尺，不是「放宽后的默认」。

/** 增量档允许崩溃的全部文件：空清单 = 任何崩溃都是意外。 */
export const INCREMENTAL_CRASH_EXPECTED = [];

/** 增量档（= 产品默认档）：天花板就是实测值，只许降不许升。 */
export const INCREMENTAL_POLICY = {
  crashCeiling: INCREMENTAL_CRASH_EXPECTED.length,
  diffCeiling: 33,
  fallbackCeiling: 85,
};

/** legacy 档（--legacy）：D3e 实测的 0 / 0 / ≤2。 */
export const LEGACY_POLICY = {
  crashCeiling: 0,
  diffCeiling: 0,
  fallbackCeiling: 2,
};

export function policyOf(incrementalOn) {
  return incrementalOn ? INCREMENTAL_POLICY : LEGACY_POLICY;
}

export function unexpectedCrashes(labels, incrementalOn) {
  if (!incrementalOn) return labels.slice();
  return labels.filter((label) => !INCREMENTAL_CRASH_EXPECTED.includes(label));
}

/** 一句话把清单印成人能读的样子（空清单也有话说）。 */
export function expectedCrashList() {
  return INCREMENTAL_CRASH_EXPECTED.map((rel) => rel.slice(rel.lastIndexOf("/") + 1)).join(" / ") || "（空）";
}
