// xl:title 名字逐个取一次：`Math` 的成员（缺几个）
// xl:round 793
// xl:judge stdout
// xl:end
// 只改名：原先叫 044-names-math，判定点没变（第 793 轮）
// `Math` 自己那一格的名表——缺的那几个名字如实登记

// 保留条本身：044-names-math.ts
(() => {
  const b: any = Math;
  let v = "";
  v = "no";
  try {
    v = String(typeof b["f16round"]);
  } catch (err) {
  }
  console.log(typeof b, "f16round", v);
  v = "no";
  try {
    v = String(typeof b["random"]);
  } catch (err) {
  }
  console.log(typeof b, "random", v, "(只问名字，不调它)");
  console.log("缺", 2, "个名字");
})();

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-m09.ts（第 1–2 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => typeof Math.max + "|" + typeof Math.random + "|" + typeof Math.f16round));
console.log(t(() => (Math as any).max.length + "|" + (Math as any).random.name));
})();
