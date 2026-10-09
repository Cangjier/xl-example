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
