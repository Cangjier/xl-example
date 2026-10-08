// xl:title 数组：`length` 的非法值与越界下标
// xl:round 750
// xl:judge stdout
// xl:want differ
// xl:why **`a.length = "2"` 该把它截到 2**（规范在 `ArraySetLength` 里先走一步 `ToNumber`），
// xl:why Node 给 `2`，本仓抛 `RangeError: Invalid array length`（判据第 3 行：
// xl:why `ok:2` 对 `throw:RangeError`）。**量出来的形状**：非数字一律抛。
// xl:why **这一轮没有收它**，理由写在 `props.xl.md` 那一句旁边：`ToNumber` 的对象那一档要
// xl:why `ToPrimitive`，而 `SetPropertySearched` 的签名里没有 `protos`——
// xl:why `ToNumberOf` 的三处调用点（`SetProperty` / `SetPropertyFrom` / 引擎那一个 rt 算子）
// xl:why **全都要跟着加一格**，而这是**每一次属性写入**都要过的那条路。
// xl:why 「递一个参数」本身不难，难的是**量清楚它有没有副作用**（`SetProperty` 是整份实现里
// xl:why 最热的一格）——所以先登记、不顺手改。
// xl:end
const show = (f: () => any) => { try { return "ok:" + JSON.stringify(f()); } catch (e) { return "throw:" + (e as Error).constructor.name; } };
const a: any[] = [1, 2, 3];
console.log(show(() => { a.length = -1; return a.length; }));
console.log(show(() => { a.length = 1.5; return a.length; }));
console.log(show(() => { a.length = "2" as any; return a.length; }));
const b: any[] = [1, 2, 3];
b[5] = 9;
console.log(b.length, JSON.stringify(b), 3 in b, 5 in b);
b[10] = 1;
console.log(b.length);
const c: any[] = [];
c[4294967295] = 1;
console.log(c.length, c[4294967295]);
