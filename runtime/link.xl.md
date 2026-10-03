# dependencies
```xl
import { Program, Instruction, Handler, FunctionInfo, Constant, ShiftPc, Op } from "./ir.xl.md"
import { ValueTag } from "./value.xl.md"
```

# namespace cangjie

**链接：把多份程序拼成一份**（一台 VM、一个堆、多份模块）。

**为什么需要它**：模块之间的值**只能在同一个堆里**递过去——`Value.Ref` 是各自表里的
下标，跨机器搬值不成立。所以「模块 A 的导出给 B 用」这件事，
前提是**两份程序装在同一次装载里**。这个文件就是那一步。

**它是一次纯数据变换，而且不改源程序**（每条指令、每个常量、每项异常表都**复制**）：

- 指令 / 常量 / 函数表 / 异常表 / 源码表**依次拼接**；
- **四类下标要跟着挪**：① 指令里的 pc（`ShiftPc`，`ir.xl.md` 那处是唯一知道
  「哪两条指令带 pc」的地方）；② **入口常量**的值（`Program.EntryConstants`，
  **降级层声明的，不许猜**——脚本里的字面量整数也在常量池里，值可能与入口 pc 相同，
  「扫一遍、相等就挪」会**静默改掉字面量**）；③ 异常表下标（`TryPush` 的操作数）；
  ④ 源码跨度下标（`Instruction.Src`）；函数表的 `Entry` 与异常表的三个 pc 字段也挪。
- **不变式**：所有程序的 `IdTableHash` 必须相同（同一张算子表编出来的）——
  不同就**拒**：拼起来的程序会按一张表解释，另一半的算子号就全错了。

**它不上线**：链接在**编码之前**做（驱动的动作），所以线格式与装载验证都不认识它。

**怎么找链接后的入口**：源程序没被改，所以调用方在链接**之前**记下
「A 有几个函数」就够了——合并后 B 的入口在函数表里的下标正是那个数
（每份程序的第 0 项都是它自己的入口）。**不必再提供按名字查的辅助**。

# method LinkPrograms:(programs:Array<Program>)=>Program

**把多份程序拼成一份。** 顺序即基址顺序：第 `k` 份的指令接在前面所有份之后。

```ts
if (programs.length === 0) throw new Error("link needs at least one program");
const linked = new Program();
linked.Version = programs[0].Version;
linked.IdTableHash = programs[0].IdTableHash;
for (let i = 0; i < programs.length; i++) {
  const source = programs[i];
  if (source.Version !== linked.Version) throw new Error("link: wire version mismatch");
  if (source.IdTableHash !== linked.IdTableHash) throw new Error("link: id table hash mismatch");
  const instrBase = linked.Instrs.length;
  const constBase = linked.Consts.length;
  const handlerBase = linked.Handlers.length;
  const spanBase = linked.Spans.length;
  // ① 常量：**原样搬**。它们是**不可变**的——只有入口常量会被**换成新对象**
  // （见下），所以源程序不受影响，共享是安全的。
  //
  // **不要在这里「复制」**：第一版我写成 `Constant.OfInt(original.Int)`，
  // 于是**字符串常量也变成了整数**——B 的入口绑全局名时报的是
  // 「property keys must be strings or symbols」，而错在链接器里。
  for (let j = 0; j < source.Consts.length; j++) {
    linked.Consts.push(source.Consts[j]);
  }
  for (let j = 0; j < source.EntryConstants.length; j++) {
    const at = constBase + source.EntryConstants[j];
    const entry = linked.Consts[at];
    if (entry.Tag !== ValueTag.Int32) {
      throw new Error("link: an entry constant must be an int (pc)");
    }
    linked.Consts[at] = Constant.OfInt(entry.Int + instrBase);
  }
  // ② 指令：**复制**，然后按新基址挪 pc、挪跨度下标、挪异常表下标。
  for (let j = 0; j < source.Instrs.length; j++) {
    const original = source.Instrs[j];
    const copy = new Instruction(original.Op, original.A, original.B, original.C, original.D);
    copy.Src = original.Src >= 0 ? original.Src + spanBase : -1;
    ShiftPc(copy, instrBase);
    if (copy.Op === Op.TryPush && copy.A >= 0) copy.A = copy.A + handlerBase;
    linked.Instrs.push(copy);
  }
  // ③ 函数表：入口是 pc。
  for (let j = 0; j < source.Functions.length; j++) {
    const original = source.Functions[j];
    const info = new FunctionInfo(original.Entry + instrBase, original.SlotCount, original.ParamCount);
    info.Name = original.Name;
    info.IsGenerator = original.IsGenerator;
    info.IsAsync = original.IsAsync;
    linked.Functions.push(info);
  }
  // ④ 异常表：三个 pc 字段都挪（`FrameDepth` 是层数，不动）。
  for (let j = 0; j < source.Handlers.length; j++) {
    const original = source.Handlers[j];
    linked.Handlers.push(new Handler(original.TryStart + instrBase, original.TryEnd + instrBase,
      original.HandlerPc + instrBase, original.FrameDepth));
  }
  for (let j = 0; j < source.Spans.length; j++) {
    linked.Spans.push(source.Spans[j]);
  }
}
return linked;
```
