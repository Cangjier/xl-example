# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementBuilder } from "./statement-builder.xl.md"
```

# namespace cangjie

# class StatementShape extends ShapeToken

```txt
let x = 1;
const y = a + b;
let a = 1
let b = 2
```

**语句壳**（可行性原型 A）。根层的语句起点候选在「声明关键字格」就 Accept、把已经攒下的 raw basic token 搬进本壳并挂到宿主上
（`host.MountedUnit = 本壳`），于是后续字符先流进本壳；本壳自己持一份 `CatalogGuide`（候选为空、终结候选是
`StatementEndPossibleShape`），由终结候选在 `;` / ASI 边界 / EOF 处收口，再由本壳把建好的语句形状**原位顶替**进父单元。

本壳**不进 AST**：收口时用 `FinishShell` 把自己从父单元 `Data` 里换成建好的语句形状，壳 `Data` 里剩下的 raw 单元
（例如 ASI 提前收口时尚未归属下一条语句的边界 token）按原顺序挪回父单元、排在语句形状之后。

为什么这一批（原型 A）只有变量声明语句走壳：表达式语句的 `ExpressionStatementPossibleShape` 在根目录与
`async` / `import` / `using` / `type` 等双角色起点共用候选淘汰，把它整体换成壳会把那些「等后续单元才分家」的
起点也锁进壳里；可行性阶段先只接管 `let` / `const` / `var` 三个保留/上下文关键字的声明起点，
其它语句族与表达式语句继续走原有 legacy 路径（见 `HANDOFF.md`）。

## field Pos:int = -1

本语句 `Pos`（含前导 trivia 的起点）：建壳时由宿主按「前一个非 trivia 单元 `EndIndex`」算好，收口时直接沿用。

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method BuildFromShell:(host:Token, endIndex:int, context:SyntaxContext)=>Token

从壳里「已经攒下的 raw 单元」建当前这一条语句：`endIndex` 是最后一个**归本条语句所有**的单元在壳 `Data` 里的下标
（含该下标本身；由终结候选按 `StatementScanner` 的 `End` 折算好）。

`consumed = host.Data.slice(0, endIndex + 1)` 原样交给 `StatementBuilder`——与 `StatementPossibleShape.BuildByIndex`
喂的是同一份建造器、同一份 `[start..end]` raw 单元，因此 AST 逐节点一致。

`;` 也在 `consumed` 里：`StatementBuilder` 建完语句后 `At == Units.length`，basic token（`;`）不进语句的 `Data`。
最后把 `consumed` 从壳 `Data` 里摘掉，剩下的就是离开本条语句的 raw 单元（ASI 边界 token / 尾部 trivia）。

```ts
const shell = host as StatementShape;
if (endIndex < 0) {
  throw new Error("语句壳没有可建的代码单元");
}
const consumed:Array<Token> = host.Data.slice(0, endIndex + 1);
const builder = new StatementBuilder(host.Template, context);
builder.Load(consumed, shell.Pos);
const built = builder.BuildStatement();
if (builder.At !== builder.Units.length) {
  throw new Error("语句没有读完");
}
host.Data.splice(0, consumed.length);
return built;
```

## static method FinishShell:(shell:Token, built:Token)=>void

壳收口：把壳从父单元里**原位**换成建好的语句形状，并把壳 `Data` 里剩下的 raw 单元按原顺序插在语句形状之后；
父单元的 `MountedUnit` 若还指着壳就清掉（本条语句已经结束，后续字符回到父单元）。

两处必须显式：`built.Parent`（`splice` 不设父）、`parent.MountedUnit`（`splice` 不清挂载）。

```ts
const parent = shell.Parent;
if (parent === null) {
  throw new Error("语句壳没有父单元，无法收口");
}
const index = parent.Data.indexOf(shell);
if (index < 0) {
  throw new Error("语句壳不在父单元里，无法收口");
}
const leftover:Array<Token> = shell.Data.slice();
shell.Data.length = 0;
parent.Data.splice(index, 1, built);
built.Parent = parent;
if (parent.MountedUnit === shell) {
  parent.MountedUnit = null;
}
for (let at = 0; at < leftover.length; at++) {
  leftover[at].Parent = parent;
  parent.Data.splice(index + 1 + at, 0, leftover[at]);
}
```

## method TryToClose:(context:SyntaxContext)=>CloseStates

文件末尾的兜底：根单元在 EOF 前先把挂载单元 `TryToClose`，此时壳里可能还攒着一条没有 `;` 的语句
（`let x = 1` 在文件末尾）。这时用 `BuildFromShell` 建最后一条语句并 `FinishShell` 收口；
建不出来（空壳 / 建造器抛错）才退回基类，交给父单元的关闭流程报错。

```ts
if (!this.Closed) {
  const lastCode = ItemUtil.LastCodeInItem(this.Data);
  if (lastCode >= 0) {
    let built:Token | null = null;
    try {
      built = StatementShape.BuildFromShell(this, lastCode, context);
    } catch {
      built = null;
    }
    if (built !== null) {
        StatementShape.FinishShell(this, built);
        return CloseStates.Nothing;
      }
      // 兜底：壳里这一段建不出来（例如 `satisfies` / 类型实参这种扫描器给不出 Status==1 的形态），
      // 就把 raw 单元按原位退回父单元、把自己摘掉，让根终结候选按基线口径建剩下的语句。
      // 不这么做时壳会以「未建树的形状」留在根里，AST 少整条语句（4 个 diff 的根因）。
      const parent = this.Parent;
      if (parent !== null) {
        const index = parent.Data.indexOf(this);
        if (index >= 0) {
          const raw:Array<Token> = this.Data.slice();
          this.Data.length = 0;
          parent.Data.splice(index, 1);
          for (let at = 0; at < raw.length; at++) {
            raw[at].Parent = parent;
            parent.Data.splice(index + at, 0, raw[at]);
          }
          if (parent.MountedUnit === this) {
            parent.MountedUnit = null;
          }
          this.Parent = null;
          this.Closed = true;
          return CloseStates.Nothing;
        }
      }
  }
}
return super.TryToClose(context);
```
