# dependencies
```xl
import { Token } from "../token.xl.md"
```

# namespace cangjie

一个 item 的增量扫描状态：只追加、单调前进（INV-1/INV-2）。
`Start` 是 item 在宿主 `Data` 中的起点，`Checked` 是已消费到宿主 `Data` 的哪一格（= tokenIndex + 1）。

# class ItemScanState

## field Start:int = -1

当前 item 在宿主 `Data` 中的起点（含 trivia）。

## field Checked:int = -1

已消费到宿主 `Data` 的哪一格；只增不减。

## field Complete:bool = false

`Analyze` 是否已判定 item 收口。

## field End:int = -1

item 最后一个代码 unit 的宿主下标。

## field Code:Array<Token> = []

当前 item 的代码 unit（不含 trivia）。

## field CodeAt:Array<int> = []

`Code` 下标 → 宿主 `Data` 下标。

## field Angle:int = 0

角/括号深度（成员族用）。

## field LastCode:int = -1

最近一个代码 unit 的宿主下标。

## field HasLineBreak:bool = false

item 的代码区间里是否出现过换行（ASI 类判据用）。

## field AtEof:bool = false

文档是否已到末尾（G0）：`Feed` 入口从 `batch.AtEof` 赋值，`ItemRule.Extend/Analyze` 只读本字段。
它是**文档级事实**，不随 item 复位（`Reset` 不清它）；`Analyze` 在 `AtEof` 且无新 unit 时也必须被调用一次（G5），
因此「文件末尾无分号的语句」能在这里收口。

## method Reset:(start:int)=>void

复位到「从 `start` 开始的新 item」。

```ts
this.Start = start;
this.Checked = start;
this.Complete = false;
this.End = -1;
this.Code = [];
this.CodeAt = [];
this.Angle = 0;
this.LastCode = -1;
this.HasLineBreak = false;
```
