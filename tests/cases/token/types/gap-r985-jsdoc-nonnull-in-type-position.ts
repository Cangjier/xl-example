// xl:note 类型位里的 `!`：TS 读成 `JSDocNonNullableType`（JSDoc 时代的那一档）
// （第 985 轮登记的缺口，第 1203 轮收掉：`print-ast-common.xl.md` 的 `projectTypeExpression`
//   认两种形态——平铺的「… + 末尾那个 `!`」，以及值位那条规则已经收好的一个 `NotNull` 单元。）
type T = a!;
type U = (a!);
type V = Box<a!>;
type W = a! | b!;
