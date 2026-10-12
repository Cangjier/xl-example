// xl:title `Object.getOwnPropertyDescriptor` 在数组 / 字符串 / 函数上
// xl:round 750
// xl:judge stdout
// xl:want differ
// xl:why **内建函数的描述符取不到**（**实测把范围收窄到一行**）：`d(Math, "PI")` 两边都对，
// xl:why 而 `d(Math, "max")` 本仓**响亮地抛**（`unimplemented: ToString of this kind of value`）
// xl:why ——Node 给 `function max() { [native code] },true,false,true,undefined`。
// xl:why **根在那一格的读值**：`Math.max` 是**宿主引用**（`HostRef`），而描述符那一趟把
// xl:why `value` 渲染成文本时走到了 `ToString`，`rt.xl.md` 的 `TextUnitsOf` 对
// xl:why **宿主引用**没有答案（它只认字符串 / 数字 / 布尔 / `null` / `undefined` / 符号，
// xl:why 对象那一档明写「要 `ToPrimitive`，属于建库层」）。
// xl:why **它与第 733 轮那一族同根**（宿主引用的 `name` / 属性表），
// xl:why 但落点不同：那一处补的是 `GetProperty`，这一处是**描述符那一趟的读值**。
// xl:why **同一个用例里前六行全对**（数组下标 / `length` / 函数 `name` / 普通对象 /
// xl:why `Math.PI`）——所以缺的正是**宿主引用**这一档，不是整条路。
// xl:end
const d = (o: any, k: any) => { const x = Object.getOwnPropertyDescriptor(o, k) as any; return x === undefined ? "none" : [x.value, x.writable, x.enumerable, x.configurable, typeof x.get].join(","); };
console.log(d([1, 2], "0"), d([1, 2], "length"), d([1, 2], "2"));
console.log(d("ab", "0"), d("ab", "length"), d("ab", "1"));
console.log(d(function f() {}, "name"), d(function f() {}, "length"));
console.log(d({ a: 1 }, "a"), d({ a: 1 }, "b"));
console.log(d(Math, "PI"), d(Math, "max"));
