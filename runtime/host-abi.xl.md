# dependencies
```xl
import { Value, ValueTag } from "./value.xl.md"
import { HeapTable, PromiseState } from "./heap.xl.md"
import { IdTable, LoadedProgram, Decode, Verify } from "./ir-verify.xl.md"
import { Vm, VmStatus, HostInvoker } from "./vm.xl.md"
import { GetIndex } from "./props.xl.md"
```

# namespace cangjie

**宿主 ABI**：客户程序（C++ / C# / Rust / TS 里的那个嵌入方）与这台运行器之间的**全部约定**。

它存在的原因是**减少耦合面**：客户只认识这一份，不认识 `vm.xl.md` 的字段、不认识槽、
不认识帧。引擎内部怎么改，这一份尽量不变；这一份要变，就是**破坏性变更**。

**四件事，按重要性排。**

**一、借用规矩。** 原始值（数字 / 布尔 / `undefined` / `null`）按值传，没有所有权问题。
**引用值是「借」给宿主的**：宿主拿到一个 `<script>` 返回的对象，**下一个分配点就可能把它回收**——
因为回收器**看不见宿主语言里的变量**。要长期留着就先 `Retain`，用完 `Release`，
两者成对（同一个值 retain 两次就要 release 两次）。

**二、两条错误路，不许混。** 这三类必须分得清：

| 类别 | 谁的问题 | 宿主该做什么 |
| --- | --- | --- |
| `ScriptThrew` | 脚本自己的异常（值在 `Pending` 里） | 当成业务错误处理 |
| `OutOfSteps` / `OutOfMemory` | **限额**（宿主自己设的） | 当成资源不足，不是崩溃 |
| 宿主语言的异常 | **我们的 bug** | 让它冒出去；**绝不伪装成脚本错误** |

第三条尤其重要：把引擎的 bug 报成「脚本抛了」，客户会去查脚本——**查一整天**。

**三、确定性。** 同一份 IR + 同一组输入 + 同一套限额 = **逐值相同的结果**。所以宿主这边：

- **不许**把宿主 `async` 漏进来（那会引入宿主的调度顺序）；
- **不许**让脚本看见时间、随机数、线程 id（要它们就只能由宿主显式暴露成能力）；
- **不许**用弱引用 / 终结器（回收时机只由**计费**决定，见 `gc.xl.md`）。

**四、能力白名单。** 脚本碰不到宿主，除非宿主**注册**过：一个能力就是一个 `HostRef`
加一个内建 id。两层把关——装载时 id 必须在 id 表里，运行期那一格必须真的注册过。
没注册就报「能力未注册」，**不给 `undefined`**（静默的 `undefined` 会让脚本以为「这个函数存在但返回空」）。

# enum HostOutcome

一次脚本调用对宿主来说的结局。

- case Ok
入口函数**返回了**，值在 `HostResult.Value`。
- case ScriptThrew
脚本抛出的异常；值在 `HostResult.Error`。
- case Parked
脚本**挂着**等一个宿主还没兑现的承诺（帧挂在承诺上，不在栈上）。
- case OutOfSteps
步数预算用尽。
- case OutOfMemory
堆上限到了（或者开不出下一帧）。
- case VerifyFailed
程序没通过装载验证——**这一档在 `List`/`Call` 之前就该出现**，出现了说明字节流不可信。

# class Limits

宿主的限额。**全部由引擎内部执行**，不是「请脚本自觉」。

- `StepBudget`：指令条数上限（`vm.xl.md` 的步数预算）；
- `HeapLimit`：**计费字节**的上限（不是宿主那侧的真实内存；两者相差一个常数因子）；
- `MaxNativeDepth`：重入深度上限（访问器 / 生成器恢复 / 内建方法都会消耗宿主栈）。

**帧数不单列**：帧是堆对象，深递归最终撞的是 `HeapLimit`——**一个上限就够，
多一个就多一处不一致**。

## field StepBudget:int = 10000000

指令条数上限。

**第 358 轮从一百万抬到一千万**（**实测撞到的**）：判据 `gc-churn` 是一段
**两万次迭代**、每次造一个小数组的循环（它量的就是**回收器在压力下的行为**），
而一百万条指令**跑不完它** ⇒ 报 `step budget exhausted`——
**一个正常长度的程序被资源上限挡在门外**，而那不是「跑飞了」。
**这个上限是给「跑飞」用的**（安全第 4 层）：一千万条在实测里是**两三秒**量级，
仍然远早于任何人愿意等的时间；真正死循环的程序照样被拦（只是拦得晚一点）。
**没有改成按时间计**：那会引入一只时钟（每一轮判定都要读它），
而这个工程的口径是**同输入同结果**——条数是**确定性**的，墙上时间不是。

## field HeapLimit:int = 16777216

计费字节上限（`gc.xl.md`；低于 `MinHeapLimit` 会被抬到最小值）。

## field MaxNativeDepth:int = 64

重入深度上限（访问器 / 生成器恢复 / 内建方法）。

## constructor:(stepBudget:int, heapLimit:int, maxNativeDepth:int)=>void

三个限额一起记下来；**它们只在装载前可改**。

```ts
this.StepBudget = stepBudget;
this.HeapLimit = heapLimit;
this.MaxNativeDepth = maxNativeDepth;
```

## static method Default:()=>Limits

一套保守的默认值：**一千万**条指令、16 MiB 计费堆、64 层重入。

```ts
return new Limits(10000000, 16777216, 64);
```

# class HostResult

一次调用的结局。**成功与失败用同一个类型**，于是宿主不必写两套分支
（也不会出现「失败了但没人接」那种）。

## field Outcome:int = 0

`HostOutcome` 的值。

## field Value:Value = new Value()

`Ok` 时的返回值。

## field Error:Value = new Value()

`ScriptThrew` 时的异常值。

## field Message:string = ""

给**人**看的说明（日志 / 报错）。**别拿它当判据**——判据是 `Outcome`。

## constructor:(outcome:int, value:Value, error:Value, message:string)=>void

四个字段一起填；**失败时 `Value` 是空的，成功时 `Error` 是空的**。

```ts
this.Outcome = outcome;
this.Value = value;
this.Error = error;
this.Message = message;
```

## static method Ok:(value:Value)=>HostResult

成功。

```ts
return new HostResult(HostOutcome.Ok, value, Value.Undefined(), "");
```

## static method Failed:(outcome:int, message:string, error:Value)=>HostResult

失败（限额 / 抛出 / 挂起都走它）；`message` 给人看，判据是 `outcome`。

```ts
return new HostResult(outcome, Value.Undefined(), error, message);
```

# class Capability

**一条注册记录**：内建 id + 宿主交出来的那个 `HostRef`。

留着它不只是为了好看：宿主排查「脚本为什么调不到我的函数」时，
第一件要看的就是**注册过哪些 id**。

## field Id:int = 0

内建段里的那个 id。

## field Target:Value = new Value()

宿主函数的值（`ValueTag.HostRef`）。

## constructor:(id:int, target:Value)=>void

记一条注册。

```ts
this.Id = id;
this.Target = target;
```

# class Host

**客户程序面对的那一个门面**。它只做四件事：装载、注册能力、调用、结算承诺。

**为什么要有门面而不是让客户直接用 `Vm`**：耦合面。客户不该知道槽怎么排、帧怎么开、
微任务什么时候排空——这些一变，客户就得跟着改。门面把这四件事固定下来。

## field Machine:Vm = new Vm(new HeapTable(), 1048576, 100000)

这台机器。**它是门面的，不是客户的**。

## field Program:LoadedProgram | null = null

最近一次装载的结果。

## field Registered:Array<Capability> = []

注册过的能力（排查用）。

## field Bounds:Limits = new Limits(1000000, 16777216, 64)

限额。**装载之后就不能再改**——中途改限额会让「同输入同结果」不成立。

## field Exports:Value = new Value()

**模块的导出表**：`Evaluate` 收下的那个数组（里面是各条导出的**闭包**）。
`CallExport` 从它里面取。

## constructor:(machine:Vm, limits:Limits)=>void

客户先按自己的限额造好机器，再把它交给门面；**门面不自己造机器**——
那样客户就没法在装载前把限额与能力都摆好。

```ts
this.Machine = machine;
this.Bounds = limits;
```

## method Load:(bytes:Array<int>, ids:IdTable)=>HostResult

装载。**验证在前、装载在后**：`Verify` 先把结构过一遍，宿主因此能拿到**具体哪一条**
不合格（`Message` 里带 pc），而不是一句「装载失败」。

```ts
const decoded = Decode(bytes, ids);
if (decoded === null) {
  return HostResult.Failed(HostOutcome.VerifyFailed, "the wire form is malformed", Value.Undefined());
}
const issue = Verify(decoded, ids);
if (issue !== null) {
  return HostResult.Failed(HostOutcome.VerifyFailed, issue.Message, Value.Undefined());
}
if (!this.Machine.Load(bytes, ids)) {
  return HostResult.Failed(HostOutcome.OutOfMemory, "cannot load: out of room", Value.Undefined());
}
this.Program = this.Machine.Program;
return HostResult.Ok(Value.Undefined());
```

## method Register:(id:int, target:Value)=>bool

注册一个能力。返回 `false` 表示**这个 id 不在这一次装载的 id 表里**——
注册不进去不是「静默忽略」，宿主必须知道。

```ts
if (!this.Machine.RegisterCapability(id, target)) return false;
this.Registered.push(new Capability(id, target));
return true;
```

## method DeclarePrototypeKey:(units:Array<int>)=>void

**告诉这台机器：构造函数的原型挂在哪个属性名下**（`new` 靠它找实例的原型）。

**收的是码元，不是宿主字符串**：这一层（引擎侧）里字符串就是码元数组
（`heap.xl.md` 的口径）——`"prototype"` 这七个字**由语言层/驱动翻成码元**再交进来，
所以引擎这边**一个宿主字符串都不出现**。

```ts
this.Machine.SetPrototypeKey(this.Machine.Table.CreateString(units));
```

## method DeclareDescriptionKey:(units:Array<int>)=>void

**告诉这台机器：`s.description` 里的 `description` 是哪个字符串**（第 241 轮）。

**为什么它也要走这一条**：符号**不是一个对象**（没有属性表、没有原型那一格），
所以 `s.description` **只能由引擎在 `get_prop` 那一处特判**——
而引擎**不认识 `"description"` 这几个字母**（与 `"prototype"` 一字不差）。
**收的也是码元**（同一个理由）。

```ts
this.Machine.SetDescriptionKey(this.Machine.Table.CreateString(units));
```

## method DeclareSymbolToString:(units:Array<int>, methodId:int)=>void

**告诉这台机器：符号上那一格叫 `toString`、该调哪个号**（第 277 轮）。

**为什么它比 `DeclareDescriptionKey` 多一格实参**：`description` 那一支交出去的是**一个值**
（描述就在堆里），而 `toString` 那一支要交出一个**能被调的东西**——一个 `HostRef`——
**而能力号是语言层的事**（引擎不认识那些号，与 `ErrorKindType` 同一条道理），
所以号只能从这里进去。

**名字与号一次给**（与 `SetToStringKeys` 那一处同一条理由）：
分开给会留一段「键认得出、号还是 `0`」的窗口，那一段里 `s.toString` 是个假的调用目标。

```ts
this.Machine.SetToStringKeys(this.Machine.Table.CreateString(units), methodId);
```

## method InstallHost:(invoker:HostInvoker)=>void

装上真正去执行宿主函数的那个通道（客户语言里的实现）。

**同一个通道也服务内建方法**（`arr.push(x)` 里的 `push`）：宿主函数**按
`HostRef.CapabilityId` 自己分派**，所以**一个通道函数可以服务全部内建**
（`typescript-exec/builtins/array.xl.md` 就是这么装的）。

**通道的签名里带 `room`，而这不是可选的**：宿主函数要分配就得先问
（内建方法正是这么做的）。少问一次就等于把「资源上限」这一层安全要求挖了个洞——
而那种洞**不会报错**，只会让上限静默失效。

```ts
this.Machine.InstallHost(invoker);
```

## method Retain:(value:Value)=>void

拿住一个引用值（见文首「借用规矩」）。

```ts
this.Machine.Retain(value);
```

## method Release:(handle:int)=>void

归还一个根。

```ts
this.Machine.Release(handle);
```

## method Evaluate:(args:Array<Value>)=>HostResult

**求值一个模块**：跑入口函数（下标 0），把它的返回值收成**导出表**。

`Call(0, args)` 与它的区别就是「收下导出表」——之后 `CallExport` 才有东西可调。**入口返回的是数组而不是 `halt`**：`halt` 之后宿主手上没有任何**值**，
而按函数表下标开出来的帧**没有环境**，凡是引用模块作用域变量的函数都跑不起来
（`vm.xl.md` 的 `StartClosure` 那一节讲了为什么）。

**收下的时候必须 `Retain`**：入口函数一返回，它的帧就弹掉了，导出表（以及它牵着的那些
闭包与环境）**在回收器眼里没有任何根**——宿主手里那个引用回收器看不见（文首「借用规矩」）。
少了这一步，下一次回收会把整条链收走，而表现是**后面几次调用读到零值**：
判据报的是「`finally` 里的写读回来还是 0」，**错的却是几百条指令之前的这次求值**。

**`args[0]` 是宿主给模块的「环境对象」**：`Math` / `console` 这类**全局名**不是原型
方法（原型链找不到它们），而是**模块作用域里的名字**——降级层把它们当入口函数的
**参数 0**，从这个对象上逐个取出来（`typescript-exec/lowering.xl.md` 的 `BindGlobals`）。
**这就是「模块从宿主拿环境」这条 ABI 的样子**：名单由语言层的建库模块给出
（`builtins/globals.xl.md` 的 `GlobalNames`），对象由宿主按同一张名单造出来。

```ts
const result = this.Call(0, args);
if (result.Outcome === HostOutcome.Ok) {
  if (this.Exports.IsRef()) this.Machine.Release(this.Exports.Ref);
  this.Machine.Retain(result.Value);
  this.Exports = result.Value;
}
return result;
```

## method CallExport:(index:int, args:Array<Value>)=>HostResult

**按下标调一个导出**：从导出表里取出那条**闭包**，用 `StartClosure` 开帧。

**为什么收下标而不是名字**：名字到下标是**语言层**的事（它知道导出表怎么排的），
而 `runtime/` 不该认识 `typescript-exec/` 的类型——**依赖方向不能倒**。

```ts
if (!this.Exports.IsRef()) {
  return HostResult.Failed(HostOutcome.Parked, "no module evaluated yet", Value.Undefined());
}
const callee = GetIndex(this.Machine.Table, this.Exports, Value.FromInt(index));
if (!this.Machine.StartClosure(callee, args)) {
  return HostResult.Failed(HostOutcome.OutOfMemory, "cannot open the entry frame", Value.Undefined());
}
this.Machine.Run();
if (this.Machine.Status === VmStatus.Halted) {
  if (!this.Machine.DrainMicrotasks()) return this.Classify();
}
return this.Classify();
```

## method Call:(entry:int, args:Array<Value>)=>HostResult

**把一次脚本调用跑完，含微任务**，然后翻成结局。

**「跑完」包含排空微任务**：脚本里 `await` 出来的续体属于**这一次调用**；
把它们留到下一次，等于让宿主看见一个半成品的结果。

```ts
if (!this.Machine.Start(entry, args)) {
  return HostResult.Failed(HostOutcome.OutOfMemory, "cannot open the entry frame", Value.Undefined());
}
this.Machine.Run();
if (this.Machine.Status === VmStatus.Halted) {
  if (!this.Machine.DrainMicrotasks()) return this.Classify();
}
return this.Classify();
```

## method Settle:(promise:Value, value:Value)=>void

宿主兑现一个承诺。**它的续体只是排进微任务队列**，由下一次 `Call`
（或者显式的 `Drain`）跑掉——宿主想立刻推进就自己调 `Drain`。

```ts
this.Machine.ResolvePromise(promise, value);
```

## method Drain:()=>bool

把微任务队列跑干净。返回 `false` 表示**跑到一半出事了**（异常 / 限额），
这时候要看 `Classify()` 拿到的结局。

```ts
return this.Machine.DrainMicrotasks();
```

## method Classify:()=>HostResult

把机器当前的状态翻成宿主的结局。

**顺序是语义**：异常与限额先判（它们比「跑完了」更具体），最后才轮到
「返回了」与「挂着」。

```ts
const status = this.Machine.Status;
if (status === VmStatus.OutOfSteps) {
  return HostResult.Failed(HostOutcome.OutOfSteps, "step budget exhausted", Value.Undefined());
}
if (status === VmStatus.OutOfMemory) {
  return HostResult.Failed(HostOutcome.OutOfMemory, "heap limit reached", Value.Undefined());
}
if (status === VmStatus.Threw) {
  return HostResult.Failed(HostOutcome.ScriptThrew, "the script threw", this.Machine.Pending);
}
if (this.Machine.Finished) return HostResult.Ok(this.Machine.Result);
return HostResult.Failed(HostOutcome.Parked, "the script is waiting for a promise the host has not settled", Value.Undefined());
```
