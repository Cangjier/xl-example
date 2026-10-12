// xl:title console.group 那一族：缩进状态机（嵌套 / 解绑 / 标签渲染 / 类型与形参个数）
// xl:round 763
// xl:judge stdout
// xl:note 第 763 轮收掉的那一处：`console.group` / `groupCollapsed` / `groupEnd` 三格
// xl:note 原来**根本没挂**（`cannot call a non-closure value`）。
// xl:note **缩进落在每一行上**（不只 `log`）——所以出口收成 `ConsoleWriteLine` 一处，
// xl:note 这一族十一支一起跟着 `group` 动；**状态挂在 `console` 那个对象上**，
// xl:note 与调用时的接收者无关（`const g = console.group; g("x")` 在 Node 里照样进一级——
// xl:note 这一格是实测撞到的）。形状与取舍写在 `ConsoleGroup` 那一段里。
// xl:note **第 809 轮把同判定点的四条并了进来**（正文逐字照抄、只按来源顺序相接，
// xl:note 原 `r763a-01` / `a-02` / `a-03` / `b-01`）：缩进的状态机只有一处，
// xl:note 四条问的是同一件事的四个面——基本嵌套与三个 `typeof` / `length`、
// xl:note 标签渲染与嵌套层数、`%s-%d` 与 `count` / `assert` / `dir` 的相互作用、
// xl:note `groupEnd` 到底与解绑调用（状态挂在 `console` 上，与 `this` 无关）。
// xl:note 第 763 轮收掉的那两格（`%s-%d` 的说明符消耗、`count` / `assert` 的缩进）
// xl:note 在四条来源里各量了一遍，正是同一处根被写了四遍的证据。
// xl:end
console.log("A");
console.group("g1");
console.log("B");
console.group();
console.log("C");
console.error("E");
console.groupEnd();
console.log("D");
console.groupEnd();
console.log("F");
console.groupCollapsed("g2");
console.log("G");
console.groupEnd();
console.log("H");
console.groupEnd();
console.log("I");
console.log(typeof console.group, typeof console.groupEnd, typeof console.groupCollapsed);
console.log(console.group.length, console.groupEnd.length, console.groupCollapsed.length);
console.group("outer", 1, { a: 1 });
console.log("x");
console.group("mid");
console.group("inner");
console.log("y");
console.groupEnd();
console.groupEnd();
console.groupEnd();
console.log("z");
console.group();
console.group();
console.group();
console.log("w");
console.groupEnd();
console.groupEnd();
console.groupEnd();
console.log("v");
console.group("%s-%d", 7);
console.count("c");
console.count("c");
console.assert(false, "boom");
console.groupEnd();
console.log("after");
console.group("g");
console.dir({ a: 1 });
console.info("i");
console.warn("w");
console.groupEnd();
console.log("done");
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
