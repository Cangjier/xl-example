# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { LineAnnotation } from "../line-annotation.xl.md"
import { AreaAnnotation } from "../area-annotation.xl.md"
import { Symbol } from "../symbol.xl.md"
import { TypeLiteralBody } from "./type-literal-body.xl.md"
import { WrapSymbol } from "../wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型字面量：把**类型位**的 `{ … }` 收成一个 `TypeLiteral`（里面是一段 `TypeLiteralBody`）。

**它必须排在 `JsonObjectReorganization` 之前**：重组是**按规则轮询**的（每条规则扫一遍所有下标），
`JsonObject` 排在前面时会把类型位的 `{ … }` 先收成对象字面量，成员从此只能平铺成 `Common` / `Symbol`。
类型位的判定没用「看括号前面是不是 `:` / `=`」这一条就完事——那样会把三元表达式的分支
（`cond ? {} : {}` 的第二个括号）也判成类型位，所以 `:` 还要再确认「同一层没有 `?`」。

`TypeLiteralReorganization` 写在 `TypeLiteral` **之前**。

# class TypeLiteralReorganization extends Reorganization

## static readonly field Instance:TypeLiteralReorganization = new TypeLiteralReorganization()

唯一的实例，注册进通用重组队列时用。

## private method HasTernaryQuestion:(units:Array<Token>, index:int)=>bool

`index` 处的 `:` 是不是**三元表达式的那个冒号**（往前找到第一个符号，是 `?` 就是）。

往前扫时跳过软换行、注释与整段括号（括号单元是原子的，它的内容不参与本层判定）；
遇到第一个**符号**就下结论：是 `?` 就说明这个 `:` 属于三元表达式，否则不是。

`cond ? {} : {}` 的第二个 `{}` 前面正是这种 `:`：不排除的话它会被当成类型字面量，
把对象字面量错收成 `Field` 成员。

**但 `?` 还要再看一眼它前面有没有 `extends`**：有就是**条件类型**
（`typeof globalThis extends { … } ? T` 换行 `: { prototype: …; readonly X: 1; … }`），
它两个分支都是**类型**——那个 `:` 后面正是类型字面量。
少了这一条，条件类型的假分支整段收不成 `TypeLiteral`，
里面几十个成员一起丢（实测 `@types/node/web-globals/domexception.d.ts` 的
`var DOMException: … ? T : { … }` 一处就丢 28 个，crypto / typescript 等文件里同类形状更多）。

```ts
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item instanceof WrapSymbol || item instanceof Bracket) {
    continue;
  }
  if (item instanceof LineAnnotation || item instanceof AreaAnnotation) {
    continue;
  }
  if (item instanceof Symbol) {
    if (item.Is("?") === false) {
      return false;
    }
    return this.HasExtendsMarker(units, i) === false;
  }
}
return false;
```

## private method HasExtendsMarker:(units:Array<Token>, index:int)=>bool

`index`（一个 `?`）**往前**有没有条件类型的标志 `extends`。

条件类型写作 `T extends U ? A : B`，两个分支都是**类型**；
判出这个标志，`?` 后面的 `{` 与 `:` 后面的 `{` 就都能按类型字面量收。

`?` 与 `extends` 之间可以隔着换行与括号（`{ … }` 这样的约束体是**原子**的括号单元），
遇到别的符号（`;` / `=` / 语句边界）就停。

```ts
for (let k = index - 1; k >= 0; k--) {
  const before = Get(units, k);
  if (before instanceof WrapSymbol || before instanceof Bracket) {
    continue;
  }
  if (before instanceof LineAnnotation || before instanceof AreaAnnotation) {
    continue;
  }
  if (before instanceof Common) {
    if (before.Is("extends")) {
      return true;
    }
    continue;
  }
  if (before instanceof Symbol) {
    return false;
  }
}
return false;
```

## private method IsTypePosition:(units:Array<Token>, index:int)=>bool

`index` 处的 `{` 是不是处在**类型位**。

**关于括号上的 `Context` 字段（方案 A，已铺好但暂未启用）**：`Bracket.Context` 是**开括号那一刻**
算好的（见 `../text-common-util.xl.md` 的 `DecideBracketContext`），与重组时序无关 ✓。
本方法**曾经**改成「先读 `Context`、只有它是 `""` 时才落到下面这段老走法」，
测试立刻报出 5 条用例失败 + **2 个语料文件解析失败** ✗ —— 根因是：

> 词法阶段是**平列表**，它分不出「`outer: { … }` 这种**标签的冒号**」与「`x: { … }` 这种**类型标注的冒号**」
> —— 那正是**后来的规则**（`LabelReorganization` 在 `TypeLiteralReorganization` 之前跑）才带来的区分，
> 老走法能对，是因为它跑的时候冒号已经被 `Label` 收走了。

所以启用它之前，`DecideBracketContext` 还得把这个区分补上（判据在**宿主**的形态上：
宿主是参数括号 → 类型标注 ✓；宿主是语句列表且冒号前是一个裸露的名字 → 标签 ✗）。
在那之前这段老走法继续当家。

两条入口：

1. 父单元是 `GenericType`——泛型实参段里的 `{ }` 一定是类型（`Array<{ a: 1 }>`）；
2. 否则从 `{` 往前找最近的边界：
   - `?` → **条件类型真分支**的起点：往后看有没有 `extends` 标志（`HasExtendsMarker`），
     有就说明这是 `T extends U ? { … } : …` 里的那个类型字面量
     （`util.d.ts` 的 `type PreciseTokenForOptions<…> = O["type"] extends "string" ? { … }` 就是它，
     两处真分支一共 12 个成员）；
     `?:` 必须一起认：**可选**参数 / 可选属性的类型标注就是它
     （`toBase64(options?: { alphabet?: string })` 里的 `{ … }`，只认 `:` 时那个类型字面量收不成、
     里面 6 个成员一起丢 —— `lib.esnext.typedarrays.d.ts` 就是这么丢的）；
   - **已经跨过 `=` 之后再遇到 `:` 就是值位**：`const options: CliOptions = { Input: "" }` 里
     那个 `{` 往前扫会先跨过 `=`、再撞上变量标注的 `:`——题面看它像「冒号后面的类型」，
     其实 `=` 之后的那个花括号是**值**（对象字面量）✗。
     不加这一条，对象字面量会被收成 `TypeLiteral`，它的成员接着被 `FieldReorganization`
     当成字段收走（实测 `dist/ts/cjcli.ts`：一个 `CliOptions` 类型别名 5 个成员，
     外加一处 `const options: CliOptions = { … }` 的 4 个成员，产物里 **9 个 `Field`** ✗，
     差分账上 `Field` 多出的 20 个正是这种形状）；
   - **`import` / `export` 后面的 `type` 不算类型位**：`import type { A } from "m"` 里那个 `{`
     往前扫会撞到 `type`（在关键字表里）→ 被当成类型字面量 ✗，于是导入列表被收成
     `TypeLiteral`，里面每个名字还成了一个 `Field` ✗（实测产物：`<Import><Common>type</Common>
     <TypeLiteral><TypeLiteralBody><Field FieldName="A" />`）——**AST 那边一个属性都没有**，
     这正是差分账上 `Field` 长期「多出来」的一个来源。
     **判据要两条齐全**：`type` 前面是 `import` / `export`，**而且 `type` 后面紧跟一个 `{` 括号**。
     只看前一条会把 `export type CliOptions = { … }` 也挡掉 ✗（测试跑出来 `cjcli.ts`
     的 5 个 `Field` 全丢、5 条 type-only 用例报 `缺 TypeLiteral`）——那种写法里 `type` 后面是
     **别名**，花括号在 `=` 之后，属于正常的类型字面量 ✓；
   - `|` / `&` → 类型位（联合 / 交叉类型的一项）；   - `=` → 记下「跨过赋值」继续往前：再遇到 `type` 就是类型位（`type X = { … }`），
     遇到 `let` / `var` / `const` 则是值位（`const x = { … }`）；
   - 类型位关键字（`as` / `satisfies` / `extends` / `readonly` / `keyof` / `typeof` / `infer` / `new` …）→ 类型位；
   - 括号 → 值位（实参、下标、语句边界都不保证期望类型）；
   - 一路找到头没有边界 → 值位（保守：宁可保持 `JsonObject` 的既有行为）。

判定与 `../generic-type.xl.md` 的 `IsTypePosition` 同源（那边判的是 `<` 处在类型位还是表达式位）；
这里独立实现一份，因为两边看的是不同字符、也允许不同的保守程度。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
if (current.Parent instanceof GenericType) {
  return true;
}
let crossedAssignment = false;
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item instanceof WrapSymbol || item instanceof GenericType) {
    continue;
  }
  if (item instanceof LineAnnotation || item instanceof AreaAnnotation) {
    continue;
  }
  if (item instanceof Symbol) {
    const text = item.TempToString();
    if (text === ":" || text === "?:") {
      if (crossedAssignment) {
        return false;
      }
      return this.HasTernaryQuestion(units, i) === false;
    }
    if (text === "?") {
      return this.HasExtendsMarker(units, i);
    }
    if (text === "|" || text === "&") {
      return true;
    }
    if (text === "=>") {
      return true;
    }
    if (text === "=" && crossedAssignment === false) {
      crossedAssignment = true;
      continue;
    }
    return false;
  }
  if (item instanceof Bracket) {
    return false;
  }
  if (item instanceof Common) {
    const text = item.TempToString();
    if (text === "type") {
      const beforeType = Get(units, SkipPreviousWrapSymbol(units, i));
      const afterType = Get(units, SkipNextWrapSymbol(units, i));
      if (
        beforeType instanceof Common &&
        (beforeType.Is("import") || beforeType.Is("export")) &&
        afterType instanceof Bracket &&
        afterType.StartBracketChar === "{"
      ) {
        return false;
      }
    }
    if (
      text === "type" ||
      text === "as" ||
      text === "satisfies" ||
      text === "extends" ||
      text === "implements" ||
      text === "readonly" ||
      text === "keyof" ||
      text === "typeof" ||
      text === "infer" ||
      text === "new" ||
      text === "declare" ||
      text === "asserts" ||
      text === "is"
    ) {
      return true;
    }
    if (text === "let" || text === "var" || text === "const") {
      return crossedAssignment === false;
    }
    continue;
  }
  return false;
}
return false;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个类型字面量的开头。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket) || current.StartBracketChar !== "{") {
  return false;
}
if (current.Parent instanceof TypeLiteralBody) {
  return false;
}
return this.IsTypePosition(units, index);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把一个类型字面量收成一个 `TypeLiteral`，**返回新的下标**。

括号的内容整体搬给 `TypeLiteralBody`，括号本身不再留在树里；搬完要 `TryToClose()` 一次，
让体内那一轮成员重组跑起来（这一步与 `Interface.Process` 处理接口体完全一致）。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket)) {
  throw new Error("类型字面量不满足格式要求：{ ... }");
}
const result = new TypeLiteral(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
const body = result.CreateBody();
current.MoveDataTo(body);
body.Sign(current);
body.TryToClose();
result.TryToClose();
return ReplaceCountAt(units, index, 1, result);
```

# class TypeLiteral extends IndependentToken

类型字面量。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

## constructor:(template:Template)=>void

以模板创建，并把本类型的重组规则挂上来（模板里没有专门给 `TypeLiteral` 注册就用通用队列）。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method CreateBody:()=>TypeLiteralBody

新建类型字面量体并挂到自己名下，返回新单元。

```ts
return this.Add(new TypeLiteralBody(this.Template));
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new TypeLiteral(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
