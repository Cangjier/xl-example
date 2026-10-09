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
