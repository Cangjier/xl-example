// xl:title groupEnd 到底 / 解绑的 group（this 不是 console）/ 标签的渲染
// xl:round 763
// xl:judge stdout
// xl:note 第 763 轮收掉的那一处：`console.group` / `groupCollapsed` / `groupEnd` 三格
// xl:note 原来**根本没挂**（`cannot call a non-closure value`）。
// xl:note **缩进落在每一行上**（不只 `log`）——所以出口收成 `ConsoleWriteLine` 一处，
// xl:note 这一族十一支一起跟着 `group` 动；**状态挂在 `console` 那个对象上**，
// xl:note 与调用时的接收者无关（`const g = console.group; g("x")` 在 Node 里照样进一级——
// xl:note 这一格是实测撞到的）。形状与取舍写在 `ConsoleGroup` 那一段里。
// xl:end
console.groupEnd();
console.groupEnd();
console.log("still 0");
const g = console.group;
const e = console.groupEnd;
e();
console.log("after detached end");
g();
console.log("after detached group");
e();
e();
console.log("back");
console.group({ a: 1 });
console.log("obj label");
console.groupEnd();
console.group(null, undefined);
console.log("null label");
console.groupEnd();
