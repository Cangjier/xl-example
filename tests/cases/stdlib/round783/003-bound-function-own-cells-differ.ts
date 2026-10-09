// xl:title 绑定函数的自有格：多出三格**内部实现的名字**，还多一格 `prototype`
// xl:round 783
// xl:judge stdout
// xl:want differ
// xl:why 第 783 轮量到的：`f.bind(x)` 交出来的那个函数，本仓的自有名表是
// xl:why `__boundTarget,__boundThis,__boundArgs,length,prototype,name`——**五格是 JS 的、
// xl:why 另外三格是引擎自己的记账**（`__bound*` 那一摞，第 702 轮那一族的内部名），
// xl:why 而 JS 只给 `length` 与 `name`（规范 §10.4.1.3 `BoundFunctionCreate`：
// xl:why 只 `SetFunctionLength` 与 `SetFunctionName`，**没有 `prototype`**）。
// xl:why 两个出口同一处根（绑定时照抄了目标函数的那几格）：
// xl:why ① 多出 `__boundTarget` / `__boundThis` / `__boundArgs` 三个名字；
// xl:why ② 多一格 `prototype`——于是 `"prototype" in bound` 给真、`typeof bound.prototype`
// xl:why 给 `"object"`，而 JS 两问分别是**假**与 `"undefined"`。
// xl:why 三个内部名是**引擎的记账**露到了用户看得见的名表上：它不只让名表不对，
// xl:why 还让 `Object.keys` 之外的每一处枚举（`in` / `getOwnPropertyNames` / 结构化克隆）
// xl:why 都多出三格——收它要么把记账挪出属性表，要么在名表那一趟按绑定那一位过滤。
// xl:why **不许被带偏的那一半**：`length` / `name`（含 `"bound f"` 那个名字与
// xl:why 「绑一次少一格 length」）与**调用结果**都要照旧对；而且 `f.length` / `f.name`
// xl:why 这几格**不写进目标函数自己**（绑定不许改到被绑的那一个）。
// xl:why
// xl:why **第 883 轮把这一格的两条修法量清楚了**（探针实测，落点逐条指到行）：
// xl:why   ① `__boundTarget` / `__boundThis` / `__boundArgs` 是 `globals.xl.md` 的
// xl:why      `FunctionBind` 那一段用 `SetHiddenProperty` 挂的**真属性**（三格一串，
// xl:why      见 `BoundTargetName` / `BoundThisName` / `BoundArgsName`）。
// xl:why      **不能在名表那一趟按名字过滤**：用户自己写 `{ ["__boundTarget"]: 1 }`
// xl:why      是一个**真的**自有属性名（JS 给 `["__boundTarget"]`）——那正是
// xl:why      `#p` 那条注释里写的同一个坎（「代价写在明处」）。要收只能**给属性加一位
// xl:why      「内部」标记**（`heap.xl.md` 的 `Property.Flags` 用了 1/2/4 三位，
// xl:why      第 4 位空着），`FunctionBind` 写那三格时置上、名表那一趟按它滤掉。
// xl:why   ② `prototype` 那一格是**第 753 轮故意抄的**（`globals.xl.md` 那句
// xl:why      `targetProto.IsObject()` ⇒ `SetHiddenProperty(bound, "prototype", …)`）——
// xl:why      为的是 `new (F.bind(null))() instanceof F`。**这一条与本用例第 6 / 7 行
// xl:why      直接冲突**，而且**不能只删那一句**：`vm.xl.md` 的 `CreateInstance`
// xl:why      取原型走的是「构造函数自己那一格 `prototype`」，删掉抄写那一句之后
// xl:why      `new (F.bind(null))()` 会退到 `Object.prototype` ⇒ 换 `stdlib/round753/003`
// xl:why      那条红（**此消彼长，不是单点**）。
// xl:why      **要一起做**：`CreateInstance` 认「被构造的是一个绑定对象」时改从
// xl:why      `[[BoundTargetFunction]]` 上取 `prototype`（`HostConstructThis` 那一段
// xl:why      已经区分「构造」与「调用」两种情形，落点就在它旁边）。那是引擎侧一处
// xl:why      新载具，与本文件第 5 行那条「要么把记账挪出属性表、要么在名表那一趟过滤」
// xl:why      是同一件事的两端——**两条用例要同一轮收**，这一轮不动手。
// xl:end

function two(a: number, b: number) { return a + b; }
const bound = two.bind(null, 1);

console.log("01 own names = " + Object.getOwnPropertyNames(bound).join(","));
console.log("02 own count = " + Object.getOwnPropertyNames(bound).length);
console.log("03 keys = " + Object.keys(bound).length);
console.log("04 in name = " + ("name" in bound));
console.log("05 in length = " + ("length" in bound));
console.log("06 in prototype = " + ("prototype" in bound));
console.log("07 typeof prototype = " + typeof (bound as any).prototype);
console.log("08 length = " + (bound as any).length);
console.log("09 name = " + (bound as any).name);
console.log("10 call = " + (bound as any)(2));

// 绑两次：名字叠前缀，length 每次减到那边界（JS 的口径）
const boundTwice = (two as any).bind(null).bind(null, 1);
console.log("11 twice names = " + Object.getOwnPropertyNames(boundTwice).join(","));
console.log("12 twice name = " + (boundTwice as any).name);
console.log("13 twice length = " + (boundTwice as any).length);

// 目标函数那一侧不许被绑定弄脏
console.log("14 target own names = " + Object.getOwnPropertyNames(two).join(","));
console.log("15 target name = " + two.name + ", target length = " + two.length);

// `prototype` 那一格在**普通函数**上是真有的（对照组，别把这一条一起削掉）
console.log("16 plain has prototype = " + ("prototype" in two));
console.log("17 arrow has prototype = " + ("prototype" in ((() => 0) as any)));
console.log("18 bound has own length = " + Object.prototype.hasOwnProperty.call(bound, "length"));
console.log("19 bound has own name = " + Object.prototype.hasOwnProperty.call(bound, "name"));
