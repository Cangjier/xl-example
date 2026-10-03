# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
import { HeapTable, HashModulus } from "./heap.xl.md"
import { Program, Instruction, Op, RtOp, Constant, SourceSpan, Handler, FunctionInfo, BuiltinBase, RtOpCount } from "./ir.xl.md"
import { RootSet } from "./gc.xl.md"
```

# namespace cangjie

**线形态与装载验证**：把程序编成字节、从字节读回来、并在它碰引擎之前把它检查干净。
契约见 [docs/runtime-architecture.md](../docs/runtime-architecture.md) §6。

这是**安全第 1 层**，也是唯一的安全入口：IR 字节可能不是你生成的（从磁盘读、从网络来、
被篡改），所以**进来之前必须先验证**。

**验证失败返回问题，不抛异常。** 「输入不合法」是装载不可信输入的**预期结果**，
不是引擎 bug——所以走返回值（`VerifyIssue`）。抛异常留给真正的不变式被破坏
（比如回收器在根集里遇到过期句柄，见 `gc.xl.md`）。这两条路径混在一起，
调用方就没法区分「这份程序是坏的」和「引擎自己有毛病」。

**验证不做类型检查。** 动态 IL 无法被静态证明类型安全（`runtime-design-notes.md` §3.5），
这一层只证明**结构完整**：编号在表内、下标在界内、跳转落在指令边界上、区间良构。
它能挡住的是「拿坏字节把引擎带进未定义状态」，不是「这份程序语义正确」。

**线形态：定宽小端，不绑宿主的字节序。**

```
magic    4 字节：'C' 'J' 'I' 'R'
version  4 字节
ids      12 字节：GeneralCount, BuiltinCount, Hash
counts   5 × 4 字节：consts, spans, functions, handlers, instrs
consts   每项：tag(1 字节) + Int(4) + Dbl 的位模式(4) + Units 长度(4) + 每个码元(4)
spans    每项：Start(4) + End(4)
functions 每项：Entry(4) + SlotCount(4) + ParamCount(4) + Name(4) + flags(1)
handlers 每项：TryStart(4) + TryEnd(4) + HandlerPc(4) + FrameDepth(4)
instrs   每项：op(1) + A(4) + B(4) + C(4) + D(4) + Src(4)
```

**每个整数固定 4 字节、小端、二补数**（`-1` 就是 `FF FF FF FF`）。

- 为什么不定长（varint）：v1 要的是**能被逐字节审的编解码**。定宽让「第几个字节是什么」
  一眼可数，也让 C++/Rust/wasm 可以直接 `i32.load` 读——不必先实现一套变长解码。
  代价是体积（大概是 varint 的 2~4 倍），**这笔账记在这里**；将来换 varint 时，
  **逻辑结构不变**，只是每个整数的字节数变了，所以 `version` 要跟着升。
- 为什么显式小端：让各目标**不依赖宿主字节序**。规范里写死字节序，编解码两边才逐字节可比。
- 浮点按 **IEEE-754 双精度的位模式**存 4 字节…… 见下面 `WriteDouble` 的说明：
  v1 只用 4 字节存**整数化的载荷**，真正的 f64 位模式要在 P2 的类型层之后才写。

**v1 的线形态只承载整数载荷**：`Undefined` / `Null` / `Bool` / `Int32` / `String`。
`Float64` 常量在**编码时被拒**（`Encode` 返回 `null`），所以解码器也不会遇到它。

理由是 f64 的位模式要 8 字节**加一次位重解释**，而位重解释是 P2 的类型层才有的能力
（与 `runtime/value.xl.md` 那节「宽度与溢出」是同一笔账）。P2 把 f64 的位模式补进来时，
线形态升一版。

# const Magic0:int = 67

`'C'`。

# const Magic1:int = 74

`'J'`。

# const Magic2:int = 73

`'I'`。

# const Magic3:int = 82

`'R'`。

# const WireVersion:int = 1

版本号。**v1 只有一个号**：程序表示的版本（`Program.Version`）与线形态的版本共用它。
分成两个号，是等出现「程序表示变了但字节没变」这种事时才需要的区分——
现在没有这种事，就不过早地造两个号。

# class IdTable

运行时算子的两张表（通用段 + 语言内建段）在**装载时**的样子。

`Hash` 是「编译时的表」与「装载时的表」的握手凭据。**它只覆盖两段的长度**——
因为编号规则是「只追加、不改号」，长度相同就意味着表相同。加强它（把名字也哈希进去）
留到以后；现在的这版是**诚实的弱检查**：它能抓住「拿旧程序配新引擎」，
抓不住「长度一样但成员顺序被改过」——而后者违反的是规范里那条硬规则。

## field GeneralCount:int = 0

通用算子条数（应当等于 `RtOp.HostCall + 1`）。

## field BuiltinCount:int = 0

语言内建条数（`Object` / `Array` / `Promise` 这些由语言层注册的号）。

## field Hash:int = 0

两段长度的指纹。

## constructor:(generalCount:int, builtinCount:int)=>void

造一张表描述，并算出指纹。

```ts
this.GeneralCount = generalCount;
this.BuiltinCount = builtinCount;
this.Hash = (generalCount * 31 + builtinCount) % HashModulus;
```

## static method HashOf:(generalCount:int, builtinCount:int)=>int

指纹算法。**静态**：编码侧（降级层）与装载侧必须用同一份算法，所以它只有一处实现。

```ts
return (generalCount * 31 + builtinCount) % HashModulus;
```

## method Knows:(id:int)=>bool

`id` 是否落在这两张表里的某一段。

```ts
// **上界用 `RtOpCount`，不写死某个成员**：写死的话，追加一个算子之后
// 「新算子的 id 不算数」——判据报的是 `runtime op id is unknown: 37`，
// 而真正的原因是这里没跟着挪（第 45/46 轮各踩过一次）。
if (id >= 0 && id < RtOpCount) return true;
if (id >= BuiltinBase) {
  if (id < BuiltinBase + this.BuiltinCount) return true;
}
return false;
```

# class VerifyIssue

一条验证问题。

**带 PC**：装载一份坏程序时，第一件想知道的事是「坏在哪一条指令」——
没有 PC 的报错等于让人从第一个字节重新数一遍。

## field Code:int = 0

问题号（`Issue*` 常量）。

## field Pc:int = -1

出问题的指令下标；与指令无关的问题写 `-1`。

## field Message:string = ""

给人看的一句话。

## constructor:(code:int, pc:int, message:string)=>void

造一条问题。

```ts
this.Code = code;
this.Pc = pc;
this.Message = message;
```

# const IssueVersion:int = 1

版本对不上。

# const IssueIdTable:int = 2

算子表指纹对不上。

# const IssueEmpty:int = 3

程序里一条指令都没有。

# const IssueUnknownOp:int = 4

指令码不在表内。

# const IssueOperand:int = 5

操作数越界（槽号、常量下标、参数窗口……）。

# const IssueTarget:int = 6

跳转目标不是一条指令。

# const IssueFallThrough:int = 7

会「落到尾外」的指令（最后一条不是终结指令）。

# const IssueHandler:int = 8

异常表的问题（区间、处理点、`TryPush` 的下标）。

# const IssueFunction:int = 9

函数表的问题（入口、槽数、顺序）。

# const IssueConst:int = 10

常量池的问题（编码侧拒掉的档位出现在这里，就是坏字节）。

# class ByteWriter

编码用的字节缓冲。`Array<int>` 的每一项是 0..255。

**为什么不是 `byte` / `Uint8Array`**：xl 的中立类型表里还没有字节类型（P2 补）。
`Array<int>` 今天就能跑，而且四个目标的映射都是明确的；P2 换成 `Array<byte>` 时，
本文件是**唯一**要改的地方——这正是把线形态收在一个文件里的好处。

## field Bytes:Array<int> = []

缓冲。

## method WriteByte:(value:int)=>void

写一个字节。**夹到 0..255**：写超范围的字节是编码侧的 bug，但把它静默夹住
比让一个负数悄悄进缓冲、到解码侧再炸要好定位。

```ts
const clamped = value & 255;
this.Bytes.push(clamped);
```

## method WriteInt:(value:int)=>void

写一个 4 字节小端整数。

```ts
this.WriteByte(value & 255);
this.WriteByte((value >> 8) & 255);
this.WriteByte((value >> 16) & 255);
this.WriteByte((value >> 24) & 255);
```

## method WriteText:(text:string)=>void

写一个字符串（长度 + 每个码元的码元值）。给 magic 用。

```ts
this.WriteInt(text.length);
for (let i = 0; i < text.length; i++) {
  this.WriteInt(text.charCodeAt(i));
}
```

## method Count:()=>int

已写字节数。

```ts
return this.Bytes.length;
```

# class ByteReader

解码用的游标。

**`Ok` 是这一层唯一的错误通道**：任何一个 `Read*` 越界都把 `Ok` 置成 `false` 并返回 0，
调用方读完一段之后检查一次。这样解码器里不必每读一个整数就套一层判断——
而**越界不会静默**（`Ok` 为假时调用方必须放弃这份字节）。

## field Bytes:Array<int> = []

字节。

## field Offset:int = 0

游标。

## field Ok:bool = true

到目前为止是否一切正常。**一旦为假就永远是假**（后面的读都不可信）。

## constructor:(bytes:Array<int>)=>void

以一段字节造游标。

```ts
this.Bytes = bytes;
this.Offset = 0;
this.Ok = true;
```

## method ReadByte:()=>int

读一个字节。

```ts
if (this.Offset >= this.Bytes.length) {
  this.Ok = false;
  return 0;
}
const value = this.Bytes[this.Offset];
this.Offset = this.Offset + 1;
return value;
```

## method ReadInt:()=>int

读一个 4 字节小端二补数整数。

```ts
const b0 = this.ReadByte();
const b1 = this.ReadByte();
const b2 = this.ReadByte();
const b3 = this.ReadByte();
let value = b0 + b1 * 256 + b2 * 65536 + b3 * 16777216;
if (value >= 2147483648) value = value - 4294967296;
return value;
```

## method AtEnd:()=>bool

游标是否到末尾。

```ts
return this.Offset >= this.Bytes.length;
```

# method Encode:(program:Program, ids:IdTable)=>Array<int> | null

把程序编成字节。**返回 `null` 表示「这个程序编不了」**（v1 的线形态不承载浮点常量，
见文首那节）——编码失败也是预期结果，不走异常。

```ts
for (let i = 0; i < program.Consts.length; i++) {
  if (program.Consts[i].Tag === ValueTag.Float64) return null;
}
const writer = new ByteWriter();
writer.WriteInt(Magic0);
writer.WriteInt(Magic1);
writer.WriteInt(Magic2);
writer.WriteInt(Magic3);
writer.WriteInt(program.Version);
writer.WriteInt(ids.GeneralCount);
writer.WriteInt(ids.BuiltinCount);
writer.WriteInt(ids.Hash);
writer.WriteInt(program.Consts.length);
writer.WriteInt(program.Spans.length);
writer.WriteInt(program.Functions.length);
writer.WriteInt(program.Handlers.length);
writer.WriteInt(program.Instrs.length);
for (let i = 0; i < program.Consts.length; i++) {
  const item = program.Consts[i];
  writer.WriteByte(item.Tag);
  writer.WriteInt(item.Int);
  writer.WriteInt(item.Units.length);
  for (let u = 0; u < item.Units.length; u++) {
    writer.WriteInt(item.Units[u]);
  }
}
for (let i = 0; i < program.Spans.length; i++) {
  writer.WriteInt(program.Spans[i].Start);
  writer.WriteInt(program.Spans[i].End);
}
for (let i = 0; i < program.Functions.length; i++) {
  const item = program.Functions[i];
  writer.WriteInt(item.Entry);
  writer.WriteInt(item.SlotCount);
  writer.WriteInt(item.ParamCount);
  writer.WriteInt(item.Name);
  let flags = 0;
  if (item.IsGenerator) flags = flags + 1;
  if (item.IsAsync) flags = flags + 2;
  writer.WriteByte(flags);
}
for (let i = 0; i < program.Handlers.length; i++) {
  const item = program.Handlers[i];
  writer.WriteInt(item.TryStart);
  writer.WriteInt(item.TryEnd);
  writer.WriteInt(item.HandlerPc);
  writer.WriteInt(item.FrameDepth);
}
for (let i = 0; i < program.Instrs.length; i++) {
  const item = program.Instrs[i];
  writer.WriteByte(item.Op);
  writer.WriteInt(item.A);
  writer.WriteInt(item.B);
  writer.WriteInt(item.C);
  writer.WriteInt(item.D);
  writer.WriteInt(item.Src);
}
return writer.Bytes;
```

# method Decode:(bytes:Array<int>, ids:IdTable)=>Program | null

从字节读回程序。**只做结构解码**（magic、长度、字节够不够），**不做语义验证**
（那是 `Verify` 的事）：两件事分开，坏字节与坏程序才能分别定位。

`null` 表示「字节结构不成立」：magic 不对、版本字段读不出来、声明的条数与剩余字节不符、
或末尾有多余字节（多出来的字节意味着这份字节与它的头不一致，宁可拒）。

```ts
const reader = new ByteReader(bytes);
if (reader.ReadInt() !== Magic0) return null;
if (reader.ReadInt() !== Magic1) return null;
if (reader.ReadInt() !== Magic2) return null;
if (reader.ReadInt() !== Magic3) return null;
const program = new Program();
program.Version = reader.ReadInt();
const generalCount = reader.ReadInt();
const builtinCount = reader.ReadInt();
program.IdTableHash = reader.ReadInt();
const constCount = reader.ReadInt();
const spanCount = reader.ReadInt();
const functionCount = reader.ReadInt();
const handlerCount = reader.ReadInt();
const instrCount = reader.ReadInt();
if (!reader.Ok) return null;
if (generalCount !== ids.GeneralCount) return null;
if (builtinCount !== ids.BuiltinCount) return null;
if (constCount < 0 || spanCount < 0 || functionCount < 0 || handlerCount < 0 || instrCount < 0) return null;
for (let i = 0; i < constCount; i++) {
  const item = new Constant();
  item.Tag = reader.ReadByte() as ValueTag;
  item.Int = reader.ReadInt();
  const unitCount = reader.ReadInt();
  if (!reader.Ok || unitCount < 0) return null;
  for (let u = 0; u < unitCount; u++) {
    item.Units.push(reader.ReadInt());
  }
  program.Consts.push(item);
}
for (let i = 0; i < spanCount; i++) {
  const start = reader.ReadInt();
  const end = reader.ReadInt();
  program.Spans.push(new SourceSpan(start, end));
}
for (let i = 0; i < functionCount; i++) {
  const entry = reader.ReadInt();
  const slotCount = reader.ReadInt();
  const paramCount = reader.ReadInt();
  const name = reader.ReadInt();
  const flags = reader.ReadByte();
  const item = new FunctionInfo(entry, slotCount, paramCount);
  item.Name = name;
  item.IsGenerator = (flags & 1) !== 0;
  item.IsAsync = (flags & 2) !== 0;
  program.Functions.push(item);
}
for (let i = 0; i < handlerCount; i++) {
  const tryStart = reader.ReadInt();
  const tryEnd = reader.ReadInt();
  const handlerPc = reader.ReadInt();
  const frameDepth = reader.ReadInt();
  program.Handlers.push(new Handler(tryStart, tryEnd, handlerPc, frameDepth));
}
for (let i = 0; i < instrCount; i++) {
  const op = reader.ReadByte();
  const a = reader.ReadInt();
  const b = reader.ReadInt();
  const c = reader.ReadInt();
  const d = reader.ReadInt();
  const src = reader.ReadInt();
  const opValue = op as Op;
  const item = new Instruction(opValue, a, b, c, d);
  item.Src = src;
  program.Instrs.push(item);
}
if (!reader.Ok) return null;
if (!reader.AtEnd()) return null;
return program;
```

# method IsKnownOp:(op:int)=>bool

指令码是否在表内。

上界就是**最后一个成员**（今天写作 `Op.Caught`）——这是「只追加、不改序」那条规则
直接换来的：**没有需要人工维护的计数常量**，也就没有「加了成员忘了改计数」这条路。
代价是**追加一条就要把这里的上界跟着挪一次**：忘了挪，新指令会被判成「未知指令码」
（判据会当场报 `unknown opcode`，不会静默放过去）。

```ts
return op >= 0 && op <= Op.Caught;
```

# method SlotOk:(slot:int, slotCount:int, allowNone:bool)=>bool

槽号是否合法：`-1`（如果这一格允许「不用」）或落在 `[0, slotCount)`。

```ts
if (slot === -1) return allowNone;
return slot >= 0 && slot < slotCount;
```

# method OwnerOf:(program:Program, pc:int)=>int

`pc` 属于第几个函数（函数表**按 Entry 严格升序**，见 `IssueFunction` 那组检查）。
返回 `-1` 表示没有归属（这种情况本身已经是一条函数表问题）。

```ts
let owner = -1;
for (let i = 0; i < program.Functions.length; i++) {
  if (program.Functions[i].Entry <= pc) owner = i;
}
return owner;
```

# method Verify:(program:Program, ids:IdTable)=>VerifyIssue | null

**结构验证**。返回 `null` 表示通过；否则给出第一条问题。

检查清单（顺序即优先级：先便宜的先查，先结构后语义）：

1. 版本、算子表指纹；
2. 至少一条指令；
3. 函数表：非空、`Entry` 严格升序、`Entry` 在范围内、`SlotCount > 0`、
   `ParamCount` 在 `[0, SlotCount]`、第一个入口必须是 `0`；
4. 常量池：每一档必须在允许的集合里；
5. 每条指令：指令码在表内、操作数按 `Op` 逐条检查、跳转目标落在指令边界上、
   最后一条不能「落到尾外」；
6. 异常表：区间与处理点在范围内、区间非空、**区间落在同一个函数内**（跨帧的 `try`
   由 `FrameDepth` 表达，但受保护区间本身属于同一帧）；
7. `TryPush` 的下标必须是合法的异常表下标。

**故意不查的**：可达性（死代码不是安全洞）、类型（动态 IL 查不了）、
`FrameDepth` 与实际调用深度的关系（要调用图，且它只影响异常展开的正确性，
由 `vm.xl.md` 在展开时兜住）。

```ts
if (program.Version !== WireVersion) {
  return new VerifyIssue(IssueVersion, -1, "wire version mismatch: " + program.Version);
}
if (ids.GeneralCount !== RtOpCount) {
  return new VerifyIssue(IssueIdTable, -1, "general op count mismatch: " + ids.GeneralCount);
}
if (ids.Hash !== IdTable.HashOf(ids.GeneralCount, ids.BuiltinCount)) {
  return new VerifyIssue(IssueIdTable, -1, "id table hash mismatch");
}
if (program.IdTableHash !== ids.Hash) {
  return new VerifyIssue(IssueIdTable, -1, "program was compiled against another id table");
}
if (program.Instrs.length === 0) {
  return new VerifyIssue(IssueEmpty, -1, "program has no instruction");
}
if (program.Functions.length === 0) {
  return new VerifyIssue(IssueFunction, -1, "program has no function");
}
if (program.Functions[0].Entry !== 0) {
  return new VerifyIssue(IssueFunction, 0, "first function must start at 0");
}
let previousEntry = -1;
for (let i = 0; i < program.Functions.length; i++) {
  const info = program.Functions[i];
  if (info.Entry <= previousEntry) {
    return new VerifyIssue(IssueFunction, info.Entry, "function entries must be ascending");
  }
  if (info.Entry >= program.Instrs.length) {
    return new VerifyIssue(IssueFunction, info.Entry, "function entry out of range");
  }
  // **不能要求「至少一个槽」**：一个没有参数、又不碰任何槽的函数体是合法的
  // （`function () {}`、或者只读写环境格的函数）——**真正的不变量是「槽 ⊇ 参数」**，
  // 就是下面那一条。把它写成「至少一个」等于假定「函数总要算点什么」。
  if (info.ParamCount < 0 || info.ParamCount > info.SlotCount) {
    return new VerifyIssue(IssueFunction, info.Entry, "parameter count out of range");
  }
  previousEntry = info.Entry;
}
for (let i = 0; i < program.Consts.length; i++) {
  const item = program.Consts[i];
  const tag = item.Tag;
  const known = tag === ValueTag.Undefined || tag === ValueTag.Null || tag === ValueTag.Bool
    || tag === ValueTag.Int32 || tag === ValueTag.String;
  if (!known) {
    return new VerifyIssue(IssueConst, -1, "constant " + i + " has a tag the wire form cannot carry");
  }
  if (tag === ValueTag.String) {
    for (let u = 0; u < item.Units.length; u++) {
      const unit = item.Units[u];
      if (unit < 0 || unit > 65535) {
        return new VerifyIssue(IssueConst, -1, "constant " + i + " has a code unit out of range");
      }
    }
  }
}
for (let pc = 0; pc < program.Instrs.length; pc++) {
  const issue = VerifyInstruction(program, ids, pc);
  if (issue !== null) return issue;
}
for (let i = 0; i < program.Handlers.length; i++) {
  const item = program.Handlers[i];
  if (item.TryStart < 0 || item.TryEnd > program.Instrs.length) {
    return new VerifyIssue(IssueHandler, item.TryStart, "handler range out of the code");
  }
  if (item.TryStart >= item.TryEnd) {
    return new VerifyIssue(IssueHandler, item.TryStart, "handler range is empty");
  }
  if (item.HandlerPc < 0 || item.HandlerPc >= program.Instrs.length) {
    return new VerifyIssue(IssueHandler, item.HandlerPc, "handler target is not an instruction");
  }
  if (item.FrameDepth < 0) {
    return new VerifyIssue(IssueHandler, item.HandlerPc, "handler frame depth is negative");
  }
  const startOwner = OwnerOf(program, item.TryStart);
  const endOwner = OwnerOf(program, item.TryEnd - 1);
  if (startOwner !== endOwner) {
    return new VerifyIssue(IssueHandler, item.TryStart, "handler range crosses functions");
  }
}
return null;
```

# method VerifyInstruction:(program:Program, ids:IdTable, pc:int)=>VerifyIssue | null

单条指令的检查。**按 `Op` 逐条走**，把每个操作数的**界**查干净。`-1`（「这一格不用」）只对
**无操作数的指令**（`Halt` / `TryPop`）强制检查——它是给 dump 与排查用的可读性约定，
不是安全边界；把每一格都查一遍会让验证器翻一倍，却挡不住任何真正的坏输入
（要挡的是**越界**，那一条已经逐条查了）。

```ts
const item = program.Instrs[pc];
if (!IsKnownOp(item.Op)) {
  return new VerifyIssue(IssueUnknownOp, pc, "unknown opcode: " + item.Op);
}
const owner = OwnerOf(program, pc);
if (owner < 0) {
  return new VerifyIssue(IssueFunction, pc, "instruction is not inside any function");
}
const slotCount = program.Functions[owner].SlotCount;
if (item.Src < -1 || item.Src >= program.Spans.length) {
  return new VerifyIssue(IssueOperand, pc, "source span index out of range");
}
if (item.Op === Op.Halt || item.Op === Op.TryPop) {
  if (item.A !== -1 || item.B !== -1 || item.C !== -1 || item.D !== -1) {
    return new VerifyIssue(IssueOperand, pc, "this opcode takes no operand");
  }
}
if (item.Op === Op.Const) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "destination slot out of range");
  }
  if (item.B < 0 || item.B >= program.Consts.length) {
    return new VerifyIssue(IssueOperand, pc, "constant index out of range");
  }
}
if (item.Op === Op.Move) {
  if (!SlotOk(item.A, slotCount, false) || !SlotOk(item.B, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "slot out of range");
  }
}
if (item.Op === Op.Jump) {
  if (item.B < 0 || item.B >= program.Instrs.length) {
    return new VerifyIssue(IssueTarget, pc, "jump target is not an instruction");
  }
}
if (item.Op === Op.JumpIfFalse) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "condition slot out of range");
  }
  if (item.B < 0 || item.B >= program.Instrs.length) {
    return new VerifyIssue(IssueTarget, pc, "jump target is not an instruction");
  }
}
if (item.Op === Op.Return) {
  if (!SlotOk(item.A, slotCount, true)) {
    return new VerifyIssue(IssueOperand, pc, "return slot out of range");
  }
}
if (item.Op === Op.Throw) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "throw slot out of range");
  }
}
if (item.Op === Op.TryPush) {
  if (item.A < 0 || item.A >= program.Handlers.length) {
    return new VerifyIssue(IssueHandler, pc, "handler index out of range");
  }
}
if (item.Op === Op.EnvNew) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "environment slot out of range");
  }
  if (item.B < 0) {
    return new VerifyIssue(IssueOperand, pc, "environment slot count cannot be negative");
  }
}
if (item.Op === Op.EnvGet) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "destination slot out of range");
  }
  if (item.B < 0 || item.C < 0) {
    return new VerifyIssue(IssueOperand, pc, "environment depth or index is negative");
  }
}
if (item.Op === Op.EnvSet) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "value slot out of range");
  }
  if (item.B < 0 || item.C < 0) {
    return new VerifyIssue(IssueOperand, pc, "environment depth or index is negative");
  }
}
if (item.Op === Op.Call || item.Op === Op.New || item.Op === Op.CallValue) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "callee slot out of range");
  }
  if (!WindowOk(item.B, item.C, slotCount)) {
    return new VerifyIssue(IssueOperand, pc, "argument window out of range");
  }
  // **`D`：`this` 的来源**。`-1` = 没有（普通调用给 `undefined`）；
  // 否则必须是一格有效的槽——`super(...)` 用它把当前帧的 `this` 递给父类构造函数。
  if (item.D >= 0 && !SlotOk(item.D, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "this slot out of range");
  }
}
if (item.Op === Op.CallMethod) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "receiver slot out of range");
  }
  if (item.B < 0 || item.B >= program.Consts.length) {
    return new VerifyIssue(IssueOperand, pc, "method name index out of range");
  }
  if (program.Consts[item.B].Tag !== ValueTag.String) {
    return new VerifyIssue(IssueOperand, pc, "method name must be a string constant");
  }
  if (!WindowOk(item.C, item.D, slotCount)) {
    return new VerifyIssue(IssueOperand, pc, "argument window out of range");
  }
}
if (item.Op === Op.RtCall) {
  if (!ids.Knows(item.A)) {
    return new VerifyIssue(IssueOperand, pc, "runtime op id is unknown: " + item.A);
  }
  if (!SlotOk(item.B, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "result slot out of range");
  }
  if (!WindowOk(item.C, item.D, slotCount)) {
    return new VerifyIssue(IssueOperand, pc, "argument window out of range");
  }
}
if (item.Op === Op.Suspend) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "continuation slot out of range");
  }
}
if (item.Op === Op.Resume) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "resume slot out of range");
  }
}
if (item.Op === Op.LoadThis) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "this slot out of range");
  }
}
if (item.Op === Op.Await) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "await slot out of range");
  }
}
if (item.Op === Op.Caught) {
  if (!SlotOk(item.A, slotCount, false)) {
    return new VerifyIssue(IssueOperand, pc, "caught slot out of range");
  }
}
if (FallsThrough(item.Op)) {
  if (pc + 1 >= program.Instrs.length) {
    return new VerifyIssue(IssueFallThrough, pc, "last instruction may fall off the end");
  }
}
return null;
```

# method WindowOk:(base:int, count:int, slotCount:int)=>bool

参数窗口 `[base, base + count)` 是否落在帧内。

**顺带挡住整数溢出**：`count` 是坏字节时可能是个很大的正数，所以先判 `count >= 0`
与 `base >= 0`，再看和。写 `base + count` 之前先确认两个加数都非负——
否则「负数 + 大正数」会绕成一个看起来合法的窗口。

```ts
if (count < 0) return false;
if (base < 0) return false;
if (base >= slotCount) return false;
if (count > slotCount - base) return false;
return true;
```

# method FallsThrough:(op:int)=>bool

这条指令执行完会不会落到下一条。**终结指令**：`Halt` / `Return` / `Throw` / `Jump`。

```ts
if (op === Op.Halt) return false;
if (op === Op.Return) return false;
if (op === Op.Throw) return false;
if (op === Op.Jump) return false;
return true;
```

# class LoadedProgram

**装载好的程序**：程序本体 + 物化过的常量 + 它是照哪张算子表编的。

常量在这里物化成运行期的值（字符串落进堆），**而且它们是永久根**——
`Program` 本身是不可变的，所以这份缓存只能由装载方持有（见 `ir.xl.md` 的 `Constant`）。
回收器建根集时必须把它们算进去，否则常量字符串会被收掉，脚本读到的就是野句柄。

## field Code:Program

程序本体。字段名不叫 `Program`——**字段与类型同名是一个已知的坑**
（`docs/cpp-design-notes.md` 记过：C++ 里 `std::shared_ptr<Document> Document;`
会被解析成那个非静态数据成员），所以这里主动避开。

## field Values:Array<Value> = []

常量池物化后的值，下标与常量池一一对应。**这是常驻根**。

## field Ids:IdTable

它是照哪张算子表编的。

## constructor:(code:Program, ids:IdTable, table:HeapTable)=>void

装载的最后一步：物化常量。

```ts
this.Code = code;
this.Ids = ids;
this.Values = [];
for (let i = 0; i < code.Consts.length; i++) {
  this.Values.push(code.Consts[i].Materialize(table));
}
```

## method ValueOf:(index:int)=>Value

取物化后的常量。越界要抛——**这条路径只可能来自引擎 bug**（验证已经把常量下标查过了）。

```ts
if (index < 0 || index >= this.Values.length) throw new Error("constant index out of range: " + index);
return this.Values[index];
```

## method Roots:(roots:RootSet)=>void

把常驻根加进回收器的根快照。

```ts
for (let i = 0; i < this.Values.length; i++) {
  roots.AddValue(this.Values[i]);
}
```

# method Load:(bytes:Array<int>, ids:IdTable, table:HeapTable)=>LoadedProgram | null

**唯一的安全入口**：解码 → 验证 → 物化。三步任何一步不成立就返回 `null`
（调用方把它翻成一句宿主错误，不要把它变成脚本异常——这是装载期的错，不是脚本运行期的错）。

顺序是判据：**先解码后验证**，因为验证要按操作数索引常量池与指令表；
而**物化放在最后**，因为不该为一份马上要被拒的程序往堆里造东西（那笔内存还要等下一轮回收）。

```ts
const code = Decode(bytes, ids);
if (code === null) return null;
const issue = Verify(code, ids);
if (issue !== null) return null;
return new LoadedProgram(code, ids, table);
```

# method LoadIssue:(bytes:Array<int>, ids:IdTable)=>VerifyIssue | null

与 `Load` 同样走一遍，但**把问题给出来**（给判据、给宿主诊断用）。

```ts
const code = Decode(bytes, ids);
if (code === null) {
  return new VerifyIssue(IssueVersion, -1, "wire structure is broken");
}
return Verify(code, ids);
```
