// xl:title 遍历中 `clear()` + 重新装键：新装的那一格这一趟**看不见**（台账里最窄的一格）
// xl:round 687
// xl:judge stdout
// xl:want differ
// xl:why 第 687 轮把 `forEach` 那一族改成「每一步现读当下那一份」，删一格 / 加一格都收掉了
//       （判据 `109-mutate-during-iteration`）；**清空之后重新装**这一格还差一点：
//       `m.forEach` 打出 `a,z`（Node 给 `a,z`）而**长度是 2 的那一档**里，
//       第二次 `set` 进来的键在下标 1 上取到的是**另一份值**——`__k` 与 `__v`
//       在回调重入之后这一趟循环手里那一对视图与实际的那一份**分了岔**
//       （实测：清空 + 装 "z" + 装 "y" 之后 `size` 给 2、`get("z")` / `get("y")` 都答得出来，
//        但这一趟 `forEach` 只走出 `a,y`，Node 走 `a,z,y`）。
//       **退出 `forEach` 之后的状态两边是一样的**（上面那两句 `get` 都对得上），
//       所以这不是「数据存错了」，而是**这一趟循环**读错了位置——根子还没量到底，
//       这一格原样登在这里（不改成猜测的写法）。**`clear` 本身不缺**：
//       `109-mutate-during-iteration` 里那两条清空用例都过了。
// xl:end

const m = new Map<string, number>();
m.set("a", 1);
m.set("b", 2);
const seen: string[] = [];
m.forEach((v, k) => {
  seen.push(k);
  if (k === "a") {
    m.clear();
    m.set("z", 9);
    m.set("y", 8);
  }
});
console.log("map-clear-readd-foreach", seen.join(","), m.size, m.get("z"), m.get("y"));
