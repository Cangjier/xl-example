// xl:title `instanceof` 查的是原型链
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/probe693b-e42 · e43
// 判据只有一条：`instanceof` 沿**接收者的原型链**找构造函数的 `prototype`
// （与 `Symbol.hasInstance` 那一档分开：那一族是 differ 的账，见 `136-beh-instanceof-hasinstance`）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

probe(() => [] instanceof Array);
probe(() => ({}) instanceof Object);
