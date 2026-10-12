// xl:title 成员读写与长度格（数组 / 字符串 / 函数）
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/probe694-m34 · m44 · m45 · m46 · m47 · m48 · m49 · m50 · m51 · m58 · m59
//   · exec/expressions/probe693b-e70
// 判据只有一条：取一格与写一格那两条路——点号与下标落点相同、`length` 在字符串与数组上
// 都读得到（`new Array(0).length` 也一样）、`typeof` 读到的成员类型，
// 以及自引用对象的 `Object.keys` 不会打转。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

// 嵌套成员：点号与下标
probe(() => { const a = { b: { c: 1 } }; return a.b.c; });
probe(() => { const a = { b: { c: 1 } }; return a["b"]["c"]; });

// 长度格
probe(() => { const s = "abc"; return s.length; });
probe(() => { const s = "abc"; return s["length"]; });
probe(() => { const a = [1, 2]; return a.length; });
probe(() => { const a = [1, 2]; return a["length"]; });
probe(() => new Array(0).length);

// 写一格再读回来
probe(() => { const o = {}; o.a = 1; return o.a; });
probe(() => { const o = {}; o["a"] = 1; return o["a"]; });

// 成员的类型与自引用
probe(() => { const a = [1]; return typeof a[0]; });
probe(() => { const o = { f: () => 1 }; return typeof o.f; });
probe(() => { const o = {}; o.a = o; return Object.keys(o).join(","); });
