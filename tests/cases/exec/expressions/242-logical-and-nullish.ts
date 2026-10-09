// xl:title 逻辑与空值合并：`&&` / `||` / `??` 的短路取值
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/probe704-x-b25 · b26 · b27 · b28
//   · exec/expressions/probe693b-e18 · e19 · e20 · e21 · e22（第二批）
// 判据只有一条：`&&` / `||` 按真假短路并交出**操作数本身**（不是布尔），
// `??` 只在 `null` / `undefined` 上短路（`0` / `""` 会穿过去）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

probe(() => 1 ?? 2);
probe(() => null ?? 2);
probe(() => 0 || "x");
probe(() => 0 && "x");

// 第 787 轮并进来的五条（`probe693b-e18` … `e22`）
probe(() => 0 || "" || "x");
probe(() => 1 && 2 && 3);
probe(() => null ?? "d");
probe(() => 0 ?? "d");
probe(() => (0 || "a") ?? "b");
