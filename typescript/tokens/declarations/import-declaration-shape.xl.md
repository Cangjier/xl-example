# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ImportDeclarationShape extends UnitToken

对应 `SyntaxKind.ImportDeclaration` 的写法：

```txt
import a from "m";
import { a, b as c } from "m";
import * as ns from "m";
import "m";
import type { T } from "m";
import a, { b } from "m";
import a from "m" with { type: "json" };
```

**形状建成之后仍然吃字符**：`import` 那个词一关掉，`PossibleShape.Build` 就把它建出来（那时子句还没读到），建出来的这个单元接着收后面的 basic 单元，直到 `;` 或换行收尾、从宿主卸载。

**还没接上的那一截**：子句中间那些字符（`"m"` 的引号、import-equals 的 `=`、具名子句里的 `,`）在这一层还没有单元，走到那一格会落到 `Token.Default` 的抛错桩上——`StringGuide` 与符号单元回来之前，真实输入跑不到行尾。

## constructor:(template:Template)=>void

以模板创建，并接上 basic token 的跳转队列：建成之后收到的字符由这条队列收成本单元的子单元。

```ts
super(template);
this.ProcessQueue = Template.BasicBranchQueue();
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

判断当前字符是让本单元**退出**还是**前移**：`;` 或换行就收尾——签出、关闭、从宿主卸载，返回 `Done`；其余返回 `Undo`，交给跳转队列。

`;` 本身算在这条声明的范围里（签出就签在那个字符上）；换行不算——签出退到前一个字符，退不到（换行就是头一个字符）时就不收尾，继续等。

```ts
const value = source.Value;
if (value === ";") {
  this.SignOut(source);
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
if (value === "\n" || value === "\r") {
  const previous = source.Pre();
  if (previous === null) {
    return BranchStates.Undo;
  }
  this.SignOut(previous);
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```
