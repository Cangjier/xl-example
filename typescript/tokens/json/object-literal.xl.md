# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, GetSkipPrevious } from "../../../core/extensions/list-extension.xl.md"
import { IsObjectLiteralBrace, IsStatementStart } from "../../text-common-util.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

Json 对象：把 `{...}` 这种字面量从「一个花括号 + 里面的内容」重组成单个 `ObjectLiteral` 单元。

`JsonObjectCloseRule` 写在 `ObjectLiteral` **之前**（与同目录其它 token 一致）。

# class JsonObjectCloseRule extends CloseRule

它只做两件事：判断 `{` 是不是「Json 对象的开头」，是就把它连同内容收成一个 `ObjectLiteral`。

## static readonly field Instance:JsonObjectCloseRule = new JsonObjectCloseRule()

唯一的实例，注册进通用规则队列时用。

## method IsObjectAt:(units:Array<Token>, index:int)=>bool

`index` 处的 `{` 是不是一个 Json 对象的开头。

**判据本体已经搬到 `../../text-common-util.xl.md` 的 `IsObjectLiteralBrace`**（第 556 轮）：
那一句现在有**两个用户**（本规则 与两个语句成形器），而 `statement.xl.md` 不能 import 本文件
⇒ 判据必须住在两者都能 import 的那一层。这里只转调，判定链条、两处盲点与实测账都在那一处。

它与单参数版同名，所以多参数的这个叫 `IsObjectAt`（单参数版仍叫 `IsObject`，它被 `As` /
`TypeDefine` / `TernaryOperator` / `Lamda` 四个文件调用）。

```ts
return IsObjectLiteralBrace(units, index);
```

## method IsObject:(unit:Token | null)=>bool

某个单元本身是不是 `ObjectLiteral`；不是的话，回头看它所在的列表中它所在的位置是不是一个对象开头。

类型判定用 `instanceof`，`Data.IndexOf` 落成 `indexOf`（找不到同样是 `-1`）。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof ObjectLiteral) {
  return true;
}
if (unit.Parent === null) {
  return false;
}
return this.IsObjectAt(unit.Parent.Data, unit.Parent.Data.indexOf(unit));
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本次重组的起点——直接问 `IsObjectAt`。

```ts
return this.IsObjectAt(units, index);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把 `index` 处的 `{` 连同内容收成一个 `ObjectLiteral`，**返回新的下标**。

它不推进下标，直接原样返回入参。

`Parent` 在造出单元之后单独赋值。

**拿不到父单元时早退**（`current.Parent === null`）：`Replace` 要求「自己还在父单元的子单元里」，
没有父单元就抛「没有父单元」。这个形状确实会出现——**重组改短了列表、而下标还是旧扫描留下的**
（实测：`{ A }a += 1` 这种「块紧跟着表达式、中间既没有 `;` 也没有换行」的写法，
`StatementCloseRule3` 在旧下标上收出一个不可能进树的 `Statement`，
把这个括号的父单元挪成了那个孤儿）。

早退**保住内容**：括号还在 `units` 里、内容也还在括号的 `Data` 里（`MoveDataTo` 已经搬了一次，
所以这里把内容搬回去），产物里那个 `{ … }` 仍然是一个 `Bracket`、里面的东西一个不少——
只是少了一层 `ObjectLiteral` 标签。**先保住内容再让步**：这条路走的是「输入本来就已经很怪」的兜底，
宁可少一个标签，也不要整份文件解析失败。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("ObjectLiteral.CloseRule.Process: current is null");
}
if (current.Parent === null) {
  return index;
}
const result = new ObjectLiteral(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
current.MoveDataTo(result);
result.TryToClose();
current.Replace(result);
return index;
```

# class BlockCloseRule extends CloseRule

同一对花括号的**另一种读法：块语句**。

`JsonObjectCloseRule.Previous` 已经把「处在语句开头」的 `{` 排除掉了（见那里的说明），
本规则就接手那一支：给块括号补一条**语句队列**并当场跑一遍。

**为什么必须在这里补**：`{` 括号一律不带队列（见 `../bracket.xl.md` 的 `Use`），
而块里装的是语句——不补队列，`{ function g() { … } g() }` 里的函数声明、
`{ a: 1 }` 里的标签语句都退化成散着的 `Identifier`。
补的时机也只能在这里：`LabelCloseRule` 能照顾「标签后面的块」，
但**裸块**（没有标签的那些）只有本规则认得出来，而此刻它早已关闭、
收尾规则那一趟（第 561 轮之前叫 `Reorganize()`）只能由我们显式叫一次
（`TryToClose` 那次跑在没有队列的时候）。

`Process` **不消费任何单元**（块括号原样留着，只是多了队列），所以返回 `index + 1` 往下走。

## static readonly field Instance:BlockCloseRule = new BlockCloseRule()

唯一的实例，注册进通用规则队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个**还没有队列的语句位块**。

`CloseRuleQueue === null` 那一句是幂等保护：跑过一次之后本规则就不再命中，
否则队列会在每一趟扫描里被重跑（重组是「每条规则扫一遍所有下标」，同一位置会被问很多次）。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket) || current.startBracket !== "{") {
  return false;
}
if (current.CloseRuleQueue !== null) {
  return false;
}
return IsStatementStart(units, index);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

给这个块补语句队列，然后立刻跑一遍；**不替换任何单元**。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("BlockCloseRule.Process: current is null");
}
ParsePipeline.InitialCloseRuleQueue(current);
current.ApplyCloseRules();
return index + 1;
```

# class ObjectLiteral extends IndependentToken

Json 对象。

它**没有**覆写 `ToXmlString`，XML 由基类 `Token.ToXmlString` 产出：`<ObjectLiteral>子单元的 XML 串接</ObjectLiteral>`（标签名即运行时类名）。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["ObjectLiteralExpression", new Map([["children", "properties"]])]]);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **第 993 轮**：`ctx.TextOf` → `ctx.ValueOf` —— 只读那一格**自己记的**值，
  // 不回原文兜底（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。
  const properties: any[] = [];
  for (const group of ctx.Split(ctx.Kids(v), ",")) {
    const first = group[0];
    if (first.Tag() === "Spread") {
      const inner = ctx.Kids(first).filter(
        (k: any) => !(k.Tag() === "SymbolToken" && ctx.ValueOf(k) === "..."),
      );
      properties.push({
        kind: "SpreadAssignment",
        expression: inner.length > 0 ? ctx.Expression(inner) : undefined,
        pos: ctx.StartOf(first),
        end: ctx.EndOf(first),
      });
      continue;
    }
    const colonAt = group.findIndex(
      (k: any) => k.Tag() === "SymbolToken" && ctx.ValueOf(k) === ":",
    );
    if (colonAt < 0) {
      if (group.length === 1) {
        // **对象字面量成员不吃尾随逗号**（第 142 轮）：`{ m() {}, n: 1 }` 的产物把那个逗号
        // 圈进了 `MethodDeclaration` 的区间，而 TS 那边成员节点到 `}` 之前就结束。
        // 用上下文标记告诉通用支「我在对象字面量里」（与 `ctx.signature` 同一手法）。
        const savedInObject = ctx.inObjectLiteral;
        ctx.inObjectLiteral = true;
        let one;
        try {
          one = ctx.Project(group[0]);
        } finally {
          ctx.inObjectLiteral = savedInObject;
        }
        if (one !== undefined && ctx.MemberInObject.has(one.kind)) {
          properties.push(one);
        } else {
          properties.push({
            kind: "ShorthandPropertyAssignment",
            name: one,
            pos: ctx.StartOf(group[0]),
            end: ctx.EndOf(group[0]),
          });
        }
      } else {
        const one = ctx.Expression(group);
        if (one !== undefined) properties.push(one);
      }
      continue;
    }
    const nameUnits = group.slice(0, colonAt);
    const valueUnits = group.slice(colonAt + 1);
    const computed =
      nameUnits.length === 1 &&
      (ctx.IsIndexBracket(nameUnits[0]) || nameUnits[0].Tag() === "ArrayLiteral")
        ? nameUnits[0]
        : undefined;
    const name =
      computed === undefined
        ? nameUnits.length === 1 && ctx.IsNameNode(nameUnits[0])
          ? ctx.NumericLiteral.test(ctx.ValueOf(nameUnits[0]))
            ? {
                kind: "NumericLiteral",
                text: ctx.ValueOf(nameUnits[0]),
                pos: ctx.StartOf(nameUnits[0]),
                end: ctx.EndOf(nameUnits[0]),
              }
            : ctx.NameOf(nameUnits[0])
          : ctx.Expression(nameUnits)
        : {
            kind: "ComputedPropertyName",
            expression: ctx.ComputedNameExpression(computed),
            pos: ctx.StartOf(computed),
            end: ctx.EndOf(computed),
          };
    // **终点是值那一格的终点，不是「最后一格的终点」**（第 923 轮）：值单元自己可能
    // **含尾随 trivia**——`{ f: () => ({ v: 1 })/*c*/ }` 里那条注释落在箭头的体里
    // （`LamdaBody > Statement`），于是 `EndOf(最后一格)` 盖到了注释末尾
    // ⇒ 属性多出一整截（实测 TS `PropertyAssignment[17,36)` vs 产物 `[17,41)`：漂 1 多 1）。
    // `StmtEndOf` 就是投影层「节点终点不含尾部 trivia」的那一份实现（第 132 / 853 轮
    // 在语句族与 `Let` 上用过同一条），这里直接借它，不另写一份「往回吃注释」的循环。
    const initializer = valueUnits.length > 0 ? ctx.Expression(valueUnits) : undefined;
    const propertyEnd =
      initializer === undefined ? ctx.EndOf(group[group.length - 1]) : initializer.end;
    properties.push({
      kind: "PropertyAssignment",
      name,
      initializer,
      pos: ctx.StartOf(group[0]),
      end: propertyEnd,
    });
  }
  const props = properties.length === 0 ? {} : { properties };
  return ctx.NodeHead("ObjectLiteralExpression", props, v);
```


## constructor:(Template:Template)=>void

转调基类构造器，然后从规则模板里取出「本类」对应的一组收尾规则。

`CloseRuleQueue` 从模板里取：键是 `this.constructor`（`SequenceTemplate` 以类的构造器对象为键）。

```ts
super(Template);
this.CloseRuleQueue = Template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 搬入全部克隆出来的子单元 → `TryToClose()`；`Add` 收到的是一批子单元，所以这里用 `AddRange`。

```ts
const result = new ObjectLiteral(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
