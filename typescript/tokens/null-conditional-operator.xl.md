# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBackIndexed, TakeRange } from "../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol } from "../text-common-util.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Statement } from "./statement.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

空条件运算符 `?.`：把「`?.` 之后到下一个运算符为止」的一段收成一个单元。

构造时从模板取自己的重组队列。

`NullConditionalOperatorReorganization` 写在 `NullConditionalOperator` 之前。

# class NullConditionalOperatorReorganization extends Reorganization

`Previous` 只认内容恰好是 `?.` 的 `SymbolToken`。

## static readonly field Instance:NullConditionalOperatorReorganization = new NullConditionalOperatorReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是 `?.`，而且它**后面那个实义单元不是 `import`**。

**为什么要排掉 `import`**（实测：`a?.import`）：`import` 在关键字表里，而 `ImportReorganization`
排在 `NullConditionalOperatorReorganization` **之前**——那个成员名会先被收成一个 `Import` 单元，
本规则接着就会从这个 `Import` **里面**往下扫（它的 `Data` 是另一张列表），扫完在**外层列表**上做替换，
下标与元素全对不上，最后抛的是 `TypeError`（不是 `SyntaxException`）。
成员位置的 `import` 就是一个普通名字，这里直接放过它、让它留在外面当 `Keyword`。
判据用的是「跨过软换行的下一个实心单元」，与 `ImportReorganization.Previous` 里那一格同型。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken) || !current.Is("?.")) {
  return false;
}
const nextIndex = SkipNextWrapSymbol(units, index);
const next = Get(units, nextIndex);
if (next instanceof Identifier && next.Is("import")) {
  return false;
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

从 `?.` 之后一路收集到下一个「断点」，收成一个单元，**返回新的下标**。

要点：

- 断点由 `SearchBackIndexed` 从 `index + 1` 往后找：`?.`、`??`、`&&`、`||`、`;`、`,`，任何**比较符号**，
  以及「**是语句边界的软换行**」（`Statement.IsLineBreakBoundary`）。
- **为什么要判换行**：`a?.b` 换行 `c?.d` 是两条语句，而这里原来只在运算符处断开，
  于是扫描跨过换行把 `c` 也收进第一个 `NullConditionalOperator`（实测
  `tests/parse/cases/statements/stmt-asi-optional-chain.ts`）。
  链式调用里的折行不受影响：`a?.b` 换行 `.c` 的下一行以 `.` 开头，不是语句边界。
- 找不到断点（返回 `-1`）时，`count` 取「剩下全部」；否则取 `endIndex - index - 1`。
- 取区间用 `TakeRange(units, index + 1, count)`（取出不移除），随后靠 `ReplaceCountAt` 一次性替换。
- 签出时：收到东西就签到最后一个子单元，一个都没收到就签回 `?.` 自己。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken)) {
  throw new Error("current 为空");
}
const endIndex = SearchBackIndexed(units, index + 1, (itemIndex, item) => {
  if (item instanceof LineWrap) {
    return Statement.IsLineBreakBoundary(units, itemIndex);
  }
  if (item instanceof SymbolToken) {
    // **链上只允许两种符号**（第 155 轮）✓：`.`（成员访问 ✓）与 `!`（非空断言 ✓，
    // 它被 `NotNullReorganization` 折进 NCO **里面** ✓，见 `print-ast-common` 里那一支 ✓）。
    // **其余任何符号都是断点** ✓——原来只列了 `?? && || ; ,` 与比较符号 ✗，
    // 于是**算术运算符不在断点里** ✗：`a?.b` 后面跟一个 `+` 时，
    // `+` 连同右边一起被收进 NCO ✓，接着二元运算符重组在**里面**折成一个 `BinaryOperator` ✓，
    // 投影只好把它当成**成员名** ✗（`PropertyAccessExpression` 的 `name` 是个二元式 ✓），
    // 降级层于是报 `unimplemented: private or computed property name` ✗——
    // **整份文件进不来** ✗。而 `o?.k + 1` / `s?.length * 2` 这种写法遍地都是 ✓。
    //
    // **为什么不一个一个列运算符** ✗：列全了要认识算术 / 位运算 / 移位 / 赋值 / `=>` …… ✓，
    // 漏一个就是同一类静默错值 ✗。链上**该出现的符号只有那两个** ✓，
    // 所以规矩反过来写 ✓：**不是那两个就是断点** ✓——将来多出新的运算符也不必回来改 ✓。
    if (item.Is("?.")) {
      return true;
    }
    if (item.Is(".") || item.Is("!")) {
      return false;
    }
    return true;
  }
  return false;
});
const result = new NullConditionalOperator(template);
result.SignInToken(current);
const count = endIndex === -1 ? units.length - index - 1 : endIndex - index - 1;
result.AddRange(TakeRange(units, index + 1, count));
const nextIndex = ReplaceCountAt(units, index, count + 1, result);
if (result.Data.length === 0) {
  result.SignOutToken(current);
} else {
  result.SignOutToken(result.Data[result.Data.length - 1]);
}
result.TryToClose();
return nextIndex;
```

# class NullConditionalOperator extends IndependentToken

空条件运算符单元。

## constructor:(template:Template)=>void

构造器里取本类型的重组队列；运行时类型用 `this.constructor`。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new NullConditionalOperator(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
