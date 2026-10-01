# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型约束 `satisfies`：把 `expr satisfies Type` 整段收成一个 `Satisfies` 单元。

**它复用 `AsReorganization` 这条规则**：`satisfies` 与 `as` 在 TypeScript 里是同一优先级、
同样左结合的两个类型运算（`a as B satisfies C` 是 `(a as B) satisfies C`，
`a satisfies B as C` 是 `(a satisfies B) as C`），差别只在产物标签。
所以触发、收集与终止全都是 `as.xl.md` 里那一套，规则按词分派节点类型：

- `as` → `As`；
- `satisfies` → `Satisfies`（本文件）。

**不能合并成一个标签**：`x as T` 与 `x satisfies T` 的语义完全不同——
前者只做类型断言（不检查），后者是**编译期检查**（值的类型必须能赋给 `T`）。
下游拿 `<As>` 当「断言」用时，把 `satisfies` 也记成 `As` 会静默丢掉这个区别。

单元值类型是单字符的 `string`。

它**没有**覆写 `ToXmlString`，XML 由基类 `Token` 产出：`<Satisfies>子单元的 XML 串接</Satisfies>`
（标签名即运行时类名）。

# class Satisfies extends IndependentToken

类型约束 `satisfies` 表达式。

## constructor:(template:Template)=>void

转调基类构造器，并把**类型队列**挂上来——与 `As` 完全同款（见 `as.xl.md` 的同名构造器）。

**第 66 轮补的**：`Satisfies` 是第 53 轮加的类，当时只搬了 `As` 的判定与收集，
**漏了这一条**，于是 `satisfies` 右边的类型文本整片不跑类型队列：

    const y = [1, 2] satisfies number[]
    const z = a satisfies A | B

第一条的 `number[]` 停在裸 `Bracket` 上（`UnionType` / 方括号 / 类型运算符三条规则
一条都轮不到），第二条的联合也不成形。实测由 `cases:align` 的「缺 `ArrayType`」抓出来
（`ty-satisfies.ts`）。同一个类型写在 `as` 右边是对的、写在 `satisfies` 右边是错的——
两边共用的只有**判定与收集**，节点自己的队列必须各挂一次。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；
批量加入用 `AddRange`（`As.Clone` 同款）。

```ts
const result = new Satisfies(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
