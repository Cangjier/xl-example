# dependencies
```xl
import { BranchConditionResult } from "./branch-condition-result.xl.md"
import { BranchStates } from "./branch-states.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

一次「跳转尝试」的抽象：处理一个字符时，依次问每个 `Branch` 要不要接手。

# class Branch

一次跳转尝试。

`Condition` 与 `Success` 是抽象方法，写成抛错桩；`Failed` 是供子类覆写的钩子，默认空实现，直接不写 ts 体。

## field Result:BranchConditionResult = new BranchConditionResult()

**这一格跳转条件的「草稿纸」**（第 1205 轮，用户口径 1.2「提升 parse 效率」）：
每一次 `Condition` 都往这一格上写答案并把它 `return` 出去——**一条 `Branch` 实例一份**，
不再每问一次就 `new` 一个。

**为什么可以共用一份**（三件事都在这一页上，要一起读才成立）：

1. `Transit` 是**唯一**的调用点（`UnitToken.ProcessChar` 那一趟，外加 `IfSetBranch` 自己那两处），
   而它拿到答案之后**立刻**读 `Result.Success`、紧接着才调 `Success` / `Failed`
   ——中间没有第二次 `Condition` 插队的余地；
2. 各页的 `Condition` **只写不读**（全仓读 `Message` 的只有两处，都在 `Success` 的**第一句**：
   `CommonBranch` 与 `SymbolBranch`），所以嵌套再进来把这一格重写时，外面那次要读的那一格
   早就读走了；
3. `Condition` 里**没有一处会再跑解析**（判据只用「已经读到的东西」——本工程那条铁律），
   所以「写了一半被另一次跳转改写」这条路上根本没有车。

**实测**（`tmp/r1205-transit.mjs`，挂在编译产物的 `Branch.prototype.Transit` 上，
跑 `node_modules/typescript/lib/typescript.d.ts` 一份）：`Transit` 走 **6935798** 次，
其中成立 **346351** 次、不成立 **6589447** 次（**95.0%**）——这一格省掉的是每份
**659 万个临时对象**。

## field HasFailedHook:bool = false

**我这一格有没有覆写 `Failed`**（第 1210 轮，用户口径 1.2「提升 parse 效率」）：`Transit` 原来
**无条件**调一次 `this.Failed(...)`，而基类那一格是**空方法**——实测一份 `typescript.d.ts` 上
`Transit` 走 **6935798** 次、失败 **6589447** 次，其中 **6113961 次（92.8%）** 落在这个空方法上
（`tmp/r1210-count2.mjs`）：**611 万次**「多态调用 + 返回」一分钱都不产出。

**由覆写了它的那一页自己答**（与本仓一贯的口径一致：这一格是不是某一类由被问的那一页答）：
`CommonBranch`（`identifier.xl.md`）与 `SymbolBranch`（`symbol-token.xl.md`）各显式声明 `= true`，
其余一律 `false`。**判据与次序一个字没改**：`Failed` 该怎么写、什么时候该调，仍然全留在原来那一页上；
这一格只回答「值不值得为这一格进一次函数」。

## field TriggerChars:string = ""

**这一格只在「当前字符是这几个字之一」时才可能成立**（第 1217 轮，用户口径 1.2「提升 parse 效率」）。
空串 = 任何字符都要问（默认，绝大多数分支不需要声明）。

**为什么立这一格**：`UnitToken.ProcessChar` 是**每个字符**都要走一遍整个跳转队列的那一格，而
`Transit` 实测一份 `typescript.d.ts` 上走 **6935798** 次、**95.0% 答否**（第 1205 轮那一节的读数）。
答否的那些里有一大批是**一句话就能挡掉**的：`ClassBranch` / `EnumBranch` / `InterfaceBranch` /
`StaticBlockBranch` 的第一句都是 `source.Value !== "{"`、`LineAnnotationBranch` 是 `!== "/"`、
`StatementBranch` / `WrapSymbolBranch` 是 `!== "\n"`……**队列入口先用这一格挡一次**，
那一次 `Transit`（多态调用 + `Condition` + 往 `Result` 上写一格）就不必进了。

**判据一个字没改**：被挡掉的那一批，原来就是「进 `Condition`、第一句答否、立刻 `return`」的那一批；
`TriggerChars` 说的必须是**那一句里的同一格字符**——它是那一句的**前提**，不是第二份答案
（谁声明了这一格，就等于把「第一句比的是哪个字」写在类头上，`Condition` 里那一句照旧留着）。
**声明错了要出事**（那一格会被整批跳过），所以每一格都按「`Condition` 的第一句」逐个对过，
并由 `cases:tsast` / `runtime:cli` / `samples` 那几道门兜底。

**带 `HasFailedHook` 的分支不许声明这一格**（第 1235 轮实测，用户口径 1.2「提升 parse 效率」）
——这一条是量出来的，不是想出来的：`SymbolBranch` 的第一句是
`SymbolTemplate.IsSymbol(value)`，而它的 `Failed` **有副作用**（把上一个断开的 `SymbolToken` 关掉），
于是「字符不是符号 ⇒ 跳过这一支」等于**把那一趟 `Failed` 也跳过了** ⇒ 上一格 `SymbolToken`
在该断开的地方不断开：`const doubleNegate = - -x;`（两个减号中间夹一个空格）当场折成
`UnaryOperator(op="--")`，而 TS 是 `-` 套 `-` 两层。

读数如实记（**这一笔整笔撤掉**，只留判据）：

    只改 build/ 里那一份产物（SymbolBranch 写死 30 个符号字符当 TriggerChars）
      tmp/abparse.mjs 20 对 × 每批 2 轮   mean −28.98ms/轮（sd 75.70、se 16.93）13:7
      tmp/abparse.mjs 26 对 × 每批 2 轮   mean −38.21ms/轮（sd 74.66、se 14.64）17:9
      tmp/abparse.mjs 24 对 × 每批 2 轮   mean −39.13ms/轮（sd 69.64、se 14.22）18:6
    ⇒ 三读同向同量级，**可它量的是一个错的解析**：
      tmp/r1235-equiv.mjs 1697 份语料逐字节比 XML 与投影 JSON，**2 份不同**
      （expr-nested-unary.ts 的 `- -x`、gap-r922-mapped-modifier-space-before-colon.ts）
    ⇒ 于是这一格多了一句守卫：**`HasFailedHook` 答是的分支，`TriggerChars` 一律不生效**
      （写法见 `unit-token.xl.md` 的 `ProcessChar`）。守卫本身是**零影响**的
      （当时声明的四支都没有 `Failed`），1697 份语料逐字节 0 份不同。

**为什么改用「探针」也不行**（同一轮，如实记）：不写死、改成加载时拿 `IsSymbol` 扫一遍
（`for code = 0…0x2fff`，12288 次）会把这把 `switch` 喂成 megamorphic ——
探针版三读 **+7.45 / −1.52 / −1.69ms**（全是噪声），而 `IsSymbol` 一慢，
跳转那一侧省下来的全还回去。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判断本次跳转是否成立，并给出 `Message` 号。

抽象方法，由各 token 里嵌套的 `Branch` 子类实现。

```ts
throw new Error("abstract member: Condition");
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

条件成立时执行跳转：把字符加进单元、签入签出、或挂载新单元。

```ts
throw new Error("abstract member: Success");
```

## method Failed:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

条件不成立时的钩子。

默认空实现，只有少数子类重写（如 `Identifier.Branch.Failed` 会关掉上一个单元）。这里不写 ts 体，打印器产出空方法。

## method Transit:(Context:SyntaxContext, Host:Token, Src:Source)=>BranchStates

执行一次跳转：条件成立走 `Success` 并返回 `Done`，否则走 `Failed` 并返回 `Undo`。

条件结果先取出来再分流：`Success` 与 `Failed` 都要拿到同一个 `Result`。

**`Failed` 那一句先问 `HasFailedHook`**（第 1210 轮，用户口径 1.2）：那一格答「我覆写过 `Failed` 吗」，
答否就**不进函数**——省掉 611 万次落空的调用（读数与理由写在 `HasFailedHook` 那一节）。
进来的那一档走的还是**同一个 `Failed`**、同一个 `Result`，一个字没改。

```ts
const Result = this.Condition(Context, Host, Src);
if (Result.Success) {
  this.Success(Context, Host, Src, Result);
  return BranchStates.Done;
}
if (this.HasFailedHook) {
  this.Failed(Context, Host, Src, Result);
}
return BranchStates.Undo;
```
