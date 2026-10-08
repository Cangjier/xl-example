// xl:note 下标调用链当**两边**的操作数：`o["f"]().v + o["f"]().v`（第 743 轮登记的缺口）
// xl:known-gap 左边的续格在二元单元里、右边的续格掉在单元外面，两个形状同时出现时第二截没接上：降级期报 `name is not a local or a capture: v`。两半各自已经收掉（`p711b-b01` / `p711b-b02`），合起来这一格还没认。要做。
const o: any = { f: () => ({ v: 1 }) };
const r = o["f"]().v + o["f"]().v;
