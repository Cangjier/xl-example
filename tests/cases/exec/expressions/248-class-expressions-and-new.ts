// xl:title 类表达式的名字与 `new` 的被调者形状
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/probe694-m26 · m27 · m28 · m29 · m30 · m32 · m33
// **第 809 轮并入 `exec/round736/003-class-expression-name-and-tostring`**（同一个判定点在
// 另一个域里又写了一遍，两边各有一半）——它独有的四条断言接在最下面（`name` 的推导 + `toString`
// 的开头），那份文件从盘上删掉。
// 判据只有一条：`class` **表达式**当值时——它的 `name` 取被赋的那个名字（写了自己的名字
// 就取自己的，`class D {}` 赋给 `C` 时 `C.name` 是 `"D"`）、`new` 的被调者可以是
// 括号里的类表达式或函数交回来的构造器。
// **同族的 `new ns["C"]()`（成员访问交回来的类）整份文件进不来**，那是另一条账，
// 原样留在 `probe694-m31`（`xl:want blocked`）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

probe(() => { const C = class { m() { return 1; } }; return new C().m(); });
probe(() => { const C = class { m() { return 1; } }; return C.name; });
probe(() => { const C = class D { }; return C.name; });
probe(() => (function () { return new (class { constructor() { this.x = 1; } })().x; })());
probe(() => { const ns = { C: class { constructor() { this.x = 2; } } }; return new ns.C().x; });
probe(() => { const f = function () { return class { constructor() { this.x = 4; } }; }; return new (f())().x; });
probe(() => { const f = function () { return function () { this.x = 5; }; }; return new (f())().x; });
// 809 · 原 exec/round736/003（`name` 的推导与 `toString` 的开头）
probe(() => { const C = class {}; return C.name; });
probe(() => { const C = class Named {}; return C.name + ":" + (String(C).indexOf("class") === 0) + ":" + (C.name.length > 0); });
probe(() => { const C = class {}; const inst = new C(); return typeof inst.constructor; });
