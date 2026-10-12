# dependencies
```xl
import { Token } from "./token.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

**池 = 0 的那一种失败**（设计 §5 的第一种）：某个事件把**最后一个**可能形状也排除了。

按设计的说法这是**设计缺陷**：收敛表那一格划多了。所以它不是「输入有毛病」的报警，
而是「这一张表有毛病」的报警——两种情形都会走到这里，**把它们分开的只有证据**：

- 哪一次关闭触发的；
- 那个 token 是什么（标签 / 正文 / 区间）；
- 清空**之前**池里还有什么；
- 之前每一次收敛各收掉了什么。

所以这一个异常**只装证据**，不装结论。

# class ConvergenceException

xl 的 `extends` 只能指向规范内声明过的类型（`E1104`），BCL 的 `Error` 不进 `extends`：
这一格用 `Message` 字段承载那条信息（与 `core/exceptions/` 那一族同一手法）。

## field Message:string = ""

异常信息（与证据逐字相同）。

## constructor:(Msg:string)=>void

以信息创建。

```ts
this.Message = Msg;
```

## static method PoolEmptied:(before:Array<string>, closed:Token, events:Array<string>)=>ConvergenceException

按设计 §5 那一行凑证据。

```ts
const token = closed.Tag + "[text=" + closed.Text + " range=" + closed.Start + ".." + closed.End + "]";
const history = events.length === 0 ? "(这是第一次收敛)" : events.join(" / ");
return new ConvergenceException(
  "收敛到 0（设计缺陷：收敛表那一格划多了）—— 触发关闭的单元=" + token +
  "; 清空前池=[" + before.join(",") + "]; 之前的收敛事件=" + history
);
```
