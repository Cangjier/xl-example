// xl:title `for..of` 提前退出：迭代器的 `next()` 该只走一步、并且要调 `return()`
// xl:round 746
// xl:judge stdout
// xl:want differ
// xl:why **本仓把自定义迭代器一次性跑完了**：`GetIterator`（`install.xl.md`）对
// xl:why 「有 `Symbol.iterator` 的对象」那一档是**跑一遍协议、把产出收集成数组**
// xl:why （第 184 轮的做法），而 `Map` / `Set` 两档同理。于是 `for..of` 拿到的
// xl:why 是**一个已经跑完的数组**，三件事跟着错：
// xl:why   ① `next()` 被调的次数 —— Node 给 `n0,v0,r`（走一步就 `break`，
// xl:why      然后调迭代器的 `return()`），本仓给 `n0,n1,n2,v0,r`（先把整条跑干）；
// xl:why   ② **`break` / `return` / `throw` 出循环时要调 `return()`** 这一步
// xl:why      在「数组已经跑完」的形状下**没有意义**（迭代器早就结束了）；
// xl:why   ③ **无限迭代器**（`{ [Symbol.iterator]() { while (true) yield … } }`）
// xl:why      在本仓里**根本回不来**（要么跑不完、要么撞上步数预算）。
// xl:why
// xl:why **根子在模型上，不在接线**：引擎的 `iter_new` / `iter_next`（`vm.xl.md`）
// xl:why 只认**数组游标与生成器**，而 `Symbol.iterator` 那条协议要的是
// xl:why 「**一个迭代器对象** + 每一步调它的 `next()`」——那要引擎能**重入脚本**
// xl:why 并且**把迭代器对象自己挂在游标上**（现在的 `HeapIterator` 只挂 `Source`）。
// xl:why 收它是一处**引擎侧的新载具**（不是 `GetIterator` 里加几行），
// xl:why 与第 184 轮那条「先跑干、再当数组用」的取舍是同一件事的两端。
// xl:why 第 746 轮如实登在这里，**不猜**。
// xl:why
// xl:why **顺带记一条同源的**：`[...it]` / `Array.from(it)` 那种「本来就要跑干」的写法
// xl:why 现在是对的（它们的结果与 Node 逐字节相同）——错的只有**中途离开**那一档。
// xl:end
const log: string[] = [];
const it = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next: () => { log.push("n" + i); return i < 3 ? { value: i++, done: false } : { value: undefined, done: true }; },
      return: () => { log.push("r"); return { value: undefined, done: true }; },
    };
  },
};
for (const v of it as any) { log.push("v" + v); if (v === 0) break; }
console.log(log.join(","));
const drained: number[] = [];
const it2 = {
  [Symbol.iterator]() {
    let i = 0;
    return { next: () => (i < 3 ? { value: i++, done: false } : { value: undefined, done: true }) };
  },
};
for (const v of it2 as any) drained.push(v);
console.log(drained.join(","), JSON.stringify([...(it2 as any)]));
