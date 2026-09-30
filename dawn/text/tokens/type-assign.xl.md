# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBack, TakeRange } from "../../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Common } from "./common.xl.md"
import { Symbol } from "./symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型赋值：把 `type X = …;` 这一整段收成一个 `TypeAssign` 单元，段内的单元原样装进它的 `Data`（它自己不再产出 XML 属性，`ToXmlString` 走基类）。

`TypeAssignReorganization` 写在 `TypeAssign` **之前**，与同目录其它 token 一致。

# class TypeAssignReorganization extends Reorganization

`Previous` 认的是「`type` + 名字 + `=` 三个实义单元依次相邻（跨过软换行）」这一串。

`Process` 从 `type`（含它前面的 `export`）一直收到 `;` 为止——**没有** `;` 时就收到列表末尾。

## static readonly field Instance:TypeAssignReorganization = new TypeAssignReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个类型赋值的开头。

取两个「跨过软换行的下一个单元」下标，判定是一句合取：当前是内容为 `type` 的 `Common`、第一个下一个是 `Common`、第二个下一个是内容为 `=` 的 `Symbol`。这里拆成早返回，语义相同。

```ts
const current = Get(units, index);
const nextIndex1 = SkipNextWrapSymbol(units, index);
const nextIndex2 = SkipNextWrapSymbol(units, nextIndex1);
if (!(current instanceof Common) || !current.Is("type")) {
  return false;
}
if (!(Get(units, nextIndex1) instanceof Common)) {
  return false;
}
const nextSymbol = Get(units, nextIndex2);
return nextSymbol instanceof Symbol && nextSymbol.Is("=");
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整段类型赋值收成一个 `TypeAssign`，**返回新的下标**。

要点：

- `startIndex` 先取 `index`，若**跨过软换行**的上一个单元是内容为 `export` 的 `Common`，就前移到它。
- `endIndex` 向后找第一个内容为 `;` 的 `Symbol`；找不到（`-1`）就取 `units.length - 1`。
- 新单元用**当前单元**（`index` 处那个）作为 `Parent` 的来源：先 `new` 再赋值。
- 段内单元用 `TakeRange(units, startIndex, count)` 取（**取出不移除**），随后由 `ReplaceCountAt` 一次性替换掉原区间。
- 批量替换用四参数的 `ReplaceCountAt`（三个参数的版本才叫 `ReplaceAt`），返回的 `startIndex` 就是新下标。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
let startIndex = index;
const previousIndex = SkipPreviousWrapSymbol(units, index);
const previous = Get(units, previousIndex);
if (previousIndex !== -1 && previous instanceof Common && previous.Is("export")) {
  startIndex = previousIndex;
}
let endIndex = SearchBack(units, index, (item) => item instanceof Symbol && item.Is(";"));
if (endIndex === -1) {
  endIndex = units.length - 1;
}
const result = new TypeAssign(template);
result.Parent = current.Parent;
result.AddRange(TakeRange(units, startIndex, endIndex - startIndex + 1));
result.SignIn(current.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class TypeAssign extends IndependentToken
一条类型赋值（`type X = …;`）整段。

单元值类型是单字符的 `string`。

它**没有**覆写 `ToXmlString`，所以 XML 由基类产出：`<TypeAssign>段内子单元的 XML 串接</TypeAssign>`（标签名即运行时类名）。

这里**不**引 `json/` 下的任何文件：本文件用不到那个名字空间里的类型。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new TypeAssign(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
