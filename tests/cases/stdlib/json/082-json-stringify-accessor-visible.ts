// xl:title JSON.stringify 读得到访问器：getter 的值要现取
// xl:round 785
// xl:judge stdout
// xl:end
// **合并**（第 785 轮）：stdlib/json/probe695-j01 / j02 / j03 / j04 / j05 / j10 / j11 /
// j12 / j13 / j17 / j35 / j37 —— 判定点只有一个：**`JSON.stringify` 遇到访问器要现读那一格**
// （第 695 轮那处根：`JsonText` 那一趟原来遇到访问器一律跳过，给的是 `{}`）。
// 覆盖面：对象成员 / 成员旁还有数据格 / getter 返回对象、数组、`undefined`、`null` /
// 嵌套在数组里 / 类实例上 / getter 里读 `this` / 往返一趟。逐条原样搬进来。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
probe(() => JSON.stringify({ get a() { return 1; } }));
probe(() => JSON.stringify({ get a() { return 1; }, b: 2 }));
probe(() => JSON.stringify({ get a() { return { x: 1 }; } }));
probe(() => JSON.stringify({ get a() { return undefined; } }));
probe(() => JSON.stringify({ get a() { return undefined; }, b: 1 }));
probe(() => JSON.stringify({ a: { get b() { return 2; } } }));
probe(() => JSON.stringify([{ get a() { return 1; } }]));
probe(() => JSON.stringify(new (class { get a() { return 1; } })()));
probe(() => JSON.stringify({ get a() { return [1, 2]; } }));
probe(() => JSON.stringify({ get a() { return this.b; }, b: 3 }));
probe(() => JSON.stringify({ get a() { return null; } }));
probe(() => JSON.parse(JSON.stringify({ get a() { return 5; } })).a);
