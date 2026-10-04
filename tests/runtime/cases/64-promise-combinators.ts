// 第 186 轮：**`Promise.all` / `race`**——外加引擎那一格「语言层可用的 settle」。
//
// 第 185 轮把承诺造出来了、`.then` / `.catch` 也能在微任务里回调了，但 `all` / `race`
// 只能抛：它们**不是**「引擎拿回调的返回值去灌」那个形状——`all` 要在**最后一个**
// 输入到齐时才交答案（早一步交就是错的），而建库层自己改承诺状态**不行**：
// 那只把状态改了，**没有把等着它的回调排进微任务**（实测过：脚本一声不响地结束）。
//
// 所以这一轮给语言层开了一格 **`settle`**（`ResolvePromise` / `RejectPromise` 的包装）：
// 结清这件事**必须走执行器**。语言层于是能说「把这个承诺按这个值结清」。

console.log("a");
Promise.all([Promise.resolve(1), Promise.resolve(2)]).then((xs: any) => console.log("all", xs.join(",")));
console.log("b");

// 按**下标**收值：答案与「谁先回来」无关（这里是输入顺序）
Promise.all([1, 2, 3].map((n) => Promise.resolve(n * 10))).then((xs: any) => console.log("map", xs.join(",")));

// race：第一个结清的定胜负
Promise.race([Promise.resolve("fast"), Promise.resolve("slow")]).then((v: any) => console.log("race", v));

// all([]) 当场兑现成空数组；race([]) 永不结清
Promise.all([]).then((xs: any) => console.log("empty", xs.length));

// 有一个被拒绝：all 的结果跟着拒绝（回调不跑），catch 接住
Promise.all([Promise.resolve(1), Promise.reject("bad")]).catch((e: any) => console.log("rejected", e));

// 链式照旧
Promise.resolve(7).then((v: any) => v + 1).then((v: any) => console.log("chain", v));

// 一堆承诺一起等，答案按输入顺序
const mixed = [Promise.resolve("x"), Promise.reject("no"), Promise.resolve("y")];
Promise.all(mixed).catch((e: any) => console.log("mixed rejected", e));
console.log("c");
