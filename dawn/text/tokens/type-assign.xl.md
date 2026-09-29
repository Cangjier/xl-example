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

按 M33，展平的嵌套类 `TypeAssignReorganization` 写在 `TypeAssign` **之前**，与同目录其它 token 一致。

# class TypeAssignReorganization extends Reorganization

原 C# 是嵌套类 `TypeAssign.Reorganization`（M32 展平改名）。

`Previous` 认的是「`type` + 名字 + `=` 三个实义单元依次相邻（跨过软换行）」这一串。

`Process` 从 `type`（含它前面的 `export`）一直收到 `;` 为止——**没有** `;` 时就收到列表末尾。

## static readonly field Instance:TypeAssignReorganization = new TypeAssignReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`——这里的 `Reorganization` 指的是嵌套的那个类本身，按 M19 落成静态只读字段。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个类型赋值的开头。

原 C# 取两个「跨过软换行的下一个单元」下标，再写成一句合取：当前是内容为 `type` 的 `Common`、第一个下一个是 `Common`、第二个下一个是内容为 `=` 的 `Symbol`。ts 侧拆成早返回，语义相同。

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

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值。要点：

- `startIndex` 先取 `index`，若**跨过软换行**的上一个单元是内容为 `export` 的 `Common`，就前移到它。
- `endIndex` 向后找第一个内容为 `;` 的 `Symbol`；找不到（`-1`）就取 `units.Count - 1`。
- 新单元用**当前单元**（`index` 处那个）作为 `Parent` 的来源（原 C# 的对象初始化器 `new TypeAssign(...) { Parent = current.Parent }`，ts 侧拆成先 `new` 再赋值）。
- 段内单元用 `units.GetRange(startIndex, count)` 取——ts 侧是模块级函数 `TakeRange`（**取出不移除**），随后由 `ReplaceCountAt` 一次性替换掉原区间。
- `units.ReplaceAt(startIndex, count, result)` 是 4 参重载，按 M14(c) 落在 `ReplaceCountAt` 上，返回的 `startIndex` 就是新下标。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("NullReferenceException: current");
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

原 C# 侧是 `public class TypeAssign : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它**没有**覆写 `ToXmlString` / `ToDictionary`，所以 XML 由基类产出：`<TypeAssign>段内子单元的 XML 串接</TypeAssign>`（标签名即运行时类名，M17）。

原 C# 文件里有一句 `using Cangjie.Dawn.Text.Tokens.Json;`，但整个文件没有用到 Json 名字空间的任何类型，所以 ts 侧**不**引 `json/` 下的任何文件。

## constructor:(template:Template)=>void

原 C# 只是转调基类构造器。

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；批量 `Add` 按 M14(c) 写成 `AddRange`。

```ts
const result = new TypeAssign(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
