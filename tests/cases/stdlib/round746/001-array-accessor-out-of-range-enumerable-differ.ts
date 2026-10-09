// xl:title `defineProperty` 装一个**越界**下标访问器时的可枚举性
// xl:round 746
// xl:judge stdout
// xl:want differ
// xl:why 与 `p746b-b01`（**已有的**下标位上装访问器）**同一条路、相反的答案**——
// xl:why 用 `node` 现问一次量出来的两条：
// xl:why   · `const a = [1,2,3]; Object.defineProperty(a, 1, { get: () => 99 })`
// xl:why     ⇒ `Object.keys(a)` 是 `["0","1","2"]`（**看得见**）；
// xl:why   · `const e = [];    Object.defineProperty(e, 2, { get: () => 5 })`
// xl:why     ⇒ `Object.keys(e)` 是 **`[]`**（**看不见**），而 `e.length` 是 3、`e[2]` 是 5。
// xl:why 两处**唯一**的差别是「那一格原来在不在元素区里」：
// xl:why 在 ⇒ 新描述符**继承**了原来那一格的可枚举位（元素默认可枚举）；
// xl:why 不在 ⇒ 走「新建属性」，描述符没写 `enumerable` 就是假。
// xl:why 本仓两条都按「下标 ⇒ 缺省真」走（`accessorWantsEnumerable`）——
// xl:why 好处是已有那一格对上了，代价是**越界这一格多出一个键**。
// xl:why
// xl:why **差的是一个键，不是一个值**：`e.length` / `e[2]` / `e` 的形态两边一致，
// xl:why `Object.getOwnPropertyNames(e)` 两边也都是 `["2","length"]`——
// xl:why 只有「可枚举 ⇒ `Object.keys` / `for..in` 收不收」这一位不同。
// xl:why 收它要把 `accessorWantsEnumerable` 的判据从「是不是下标」改成
// xl:why 「那一格**原来在元素区里吗**」（`at < GetLength() && !IsHole(at)`）——
// xl:why 那一句要**在摘洞之前**问，而摘洞就在它上一步。第 746 轮如实登在这里。
// xl:end
const e: any[] = [];
Object.defineProperty(e, 2, { get() { return 5; }, configurable: true });
console.log(e.length, e[2], Object.keys(e).join(","));
console.log(Object.getOwnPropertyNames(e).join(","), JSON.stringify(e));
