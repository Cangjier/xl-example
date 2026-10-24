# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementBuilder } from "./statement-builder.xl.md"
import { VariableDeclarationListUtil } from "../declarations/variable-declaration-list-util.xl.md"
import { VariableListVerdict } from "../declarations/variable-declaration-list-util.xl.md"
```

# namespace cangjie

# class VariableStatementThreeLayer

Stage 5c 三层 possible 的**语句级**：在 `StatementShape.BuildFromShell` 收口时先问一句「这一条是不是
`let/const/var` 声明列表，而且三层都判成立」。成立就按三层结论建**一次**；不成立返回 `null`，
调用方逐字节走基线。

三层分工：

| 层 | 谁 | 做什么 |
| --- | --- | --- |
| 列表级 | `VariableDeclarationListUtil.Judge` | 关键字白名单 + `StartsBinding` 族判型 + `;` / 段末收口 |
| 声明级 | `VariableDeclarationUtil.VerifyItems` | 逐条判 `名字 / ! / : 类型 / = 初始化器`，给出条目数 |
| 语句级 | 本类 `TryBuild` | 两层都成立且条数一致才接管；建树复用 legacy 建造器（`BuildStatement` 派发到 `BuildVariableStatement`） |

**为什么 AST 不可能变**：接管路径执行的仍是 `builder.BuildStatement()`，`builder` 与 `consumed`
与基线同一对对象、同一份 `Pos`；本类不新增任何建树入口、不改 `consumed`、不写 `Parent`。
所以「接管与否」只改变**谁先调用**这一句，不改变调用本身。

**为什么判型不会污染**：`Judge` / `VerifyItems` 只读 `IsTriviaToken` / `TempToString` / `SourceRange`，
不调用 `StatementBuilder`、不碰形状缓存，因此 `null` 回退时外层 token 与我进来时逐字段相同。

## static field Enabled:bool = true

总开关。`false` 时 `TryBuild` 直接返回 `null`（基线逐字节），用于对照取证。

## static field StatementCount:int = 0

接管计数（语句级）：`TryBuild` 真正建出语句的次数。

## static field ListCount:int = 0

接管计数（列表级）：通过列表级判定并接管的次数。

## static field DeclarationCount:int = 0

接管计数（声明级）：所有接管语句里成立的声明条目总数。

## static field FallbackCount:int = 0

判型不成立 / 未覆盖形态 / 开关关闭而交回基线的次数（期望 > 0：回退路径真的被走到）。

## static field MismatchCount:int = 0

事后核对失败次数：建出的 `VariableStatement` 的声明条数与三层判定不一致。正常应恒为 `0`；
非 `0` 说明三层与 legacy 的条目理解不同，本类只记录、**不回退**（建树已发生，回退会拿同一批 token 建两遍）。

## static method Reset:()=>void

清零五个计数（取证脚本每个口径跑之前调用一次）。

```ts
VariableStatementThreeLayer.StatementCount = 0;
VariableStatementThreeLayer.ListCount = 0;
VariableStatementThreeLayer.DeclarationCount = 0;
VariableStatementThreeLayer.FallbackCount = 0;
VariableStatementThreeLayer.MismatchCount = 0;
```

## static method CountDeclarations:(built:Token)=>int

从建好的语句形状里数声明条数：`VariableStatement` 的 `Data[0]` 是 `VariableDeclarationList`，
它的 `Data` 就是一条条 `VariableDeclaration`。数不出来返回 `-1`。

```ts
if (built.Data.length < 1) {
  return -1;
}
const list = built.Data[0];
if (list.Data.length < 1) {
  return -1;
}
return list.Data.length;
```

## static method TryBuild:(builder:StatementBuilder, consumed:Array<Token>)=>Token | null

三层都成立时用**已有的** `builder`（外层刚 `Load(consumed, pos)` 过的那个）建一次并返回；
任何一层不成立返回 `null`，由调用方原样执行基线那一句。

```ts
if (!VariableStatementThreeLayer.Enabled) {
  VariableStatementThreeLayer.FallbackCount = VariableStatementThreeLayer.FallbackCount + 1;
  return null;
}
let verdict:VariableListVerdict | null = null;
try {
  verdict = VariableDeclarationListUtil.Judge(consumed);
} catch {
  VariableStatementThreeLayer.FallbackCount = VariableStatementThreeLayer.FallbackCount + 1;
  return null;
}
if (verdict === null || verdict.State !== 1 || verdict.Declarations <= 0) {
  VariableStatementThreeLayer.FallbackCount = VariableStatementThreeLayer.FallbackCount + 1;
  return null;
}
const built = builder.BuildStatement();
VariableStatementThreeLayer.StatementCount = VariableStatementThreeLayer.StatementCount + 1;
VariableStatementThreeLayer.ListCount = VariableStatementThreeLayer.ListCount + 1;
VariableStatementThreeLayer.DeclarationCount =
  VariableStatementThreeLayer.DeclarationCount + verdict.Declarations;
const actual = VariableStatementThreeLayer.CountDeclarations(built);
if (actual !== verdict.Declarations) {
  VariableStatementThreeLayer.MismatchCount = VariableStatementThreeLayer.MismatchCount + 1;
}
return built;
```
