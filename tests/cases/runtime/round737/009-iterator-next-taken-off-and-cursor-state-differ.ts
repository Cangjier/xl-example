// xl:title 手动迭代：`next()` 的 `this` 与取出方法再调用
// xl:round 737
// xl:judge stdout
// xl:want differ
// xl:why 同 `p737c-c06` 那条根（**迭代器就是数组**）：`const next = it.next` 再 `next.call(it)`
// xl:why 在 Node 里推进**同一个**游标（后面 `Array.from(it)` 只剩 `2`），本仓每一次取出来的
// xl:why `next` 都从头开始（后面拿到 `1,2`）——因为游标是数组的 `__i`，而取出来的那一格
// xl:why 是数组方法、`self` 由调用点递进来时**没有带上游标那一份状态**。
// xl:end
// 本文件是 `p737a-a05` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const it = [1, 2].values();
const next = it.next;
console.log(JSON.stringify(next.call(it)));
const arr = Array.from(it);
console.log(arr.join(","));
const s = "ab"[Symbol.iterator]();
console.log(JSON.stringify(s.next()), JSON.stringify(s.next()), JSON.stringify(s.next()));
