// xl:title console.group 的缩进状态
// xl:round 763
// xl:judge stdout
// xl:note 第 763 轮收掉的那一处：`console.group` / `groupCollapsed` / `groupEnd` 三格
// xl:note 原来**根本没挂**（`cannot call a non-closure value`）。
// xl:note **缩进落在每一行上**（不只 `log`）——所以出口收成 `ConsoleWriteLine` 一处，
// xl:note 这一族十一支一起跟着 `group` 动；**状态挂在 `console` 那个对象上**，
// xl:note 与调用时的接收者无关（`const g = console.group; g("x")` 在 Node 里照样进一级——
// xl:note 这一格是实测撞到的）。形状与取舍写在 `ConsoleGroup` 那一段里。
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
