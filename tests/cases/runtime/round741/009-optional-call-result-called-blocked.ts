// xl:title 可选调用**返回函数**再调用
// xl:round 741
// xl:judge stdout
// xl:want blocked
// xl:why **调用结果再调用那一格**（与 `p741a-a02` 同一族）：`o?.m()()` 里 `?.m()` 那一格
// xl:why 先被读成属性访问 ⇒ 交出来的是方法本身，再调一次时报
// xl:why `cannot call a non-closure value`（**整份文件断在这里**；Node 给 `"inner"`）。
// xl:end
// 本文件是 `p741a-a09` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const o: any = { m() { return () => "inner"; } };
console.log(o?.m()());
console.log(o?.m?.()());
const n: any = null;
console.log(n?.m?.());
