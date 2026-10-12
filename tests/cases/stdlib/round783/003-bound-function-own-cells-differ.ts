// xl:title 绑定函数的自有格：只有 `length` / `name`（三格记账 + 一格 `prototype` 都不算属性）
// xl:round 783
// xl:judge stdout
// xl:note 第 890 轮转绿（`xl:want differ` 与那几行 `xl:why` 按规矩撤掉，用例留着当守卫）：
// xl:note 缺口原来是 `f.bind(x)` 的自有名表给
// xl:note `__boundTarget,__boundThis,__boundArgs,length,prototype,name`——三格是引擎记账、
// xl:note 一格是第 753 轮转抄的 `prototype`，而 JS 只给 `["length","name"]`。
// xl:note 收法：那四格带 `PropertyFlagInternal`（`heap.xl.md` 的第 4 位），
// xl:note `FindProperty`（读属性 / `in` / 赋值）与 `Object.getOwnPropertyNames` 那一趟
// xl:note 按它滤掉；引擎自己读载荷走 `GetInternalProperty`（`props.xl.md`）。
// xl:note **按标记滤、不按名字滤**：用户自己写 `{ ["__boundTarget"]: 1 }` 是一个**真的**自有属性名。
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
