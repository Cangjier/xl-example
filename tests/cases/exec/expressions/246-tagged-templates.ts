// xl:title 标签模板：`raw`、替换位与 `s.length`
// xl:round 787
// xl:judge stdout
// xl:end
// 第 787 轮**同一判定点并组**。吸收的条（正文逐句搬进来）：
//   · exec/expressions/probe696-t01 · t02 · t03 · t04
// 判据只有一条：标签模板那一次调用收到什么——第一个实参是**模板对象**
// （带 `raw`，`raw` 里是不转义的原文）、替换位跟在后面、段数与替换位数对得上
// （空模板的 `s[0]` 是空串而不是 `undefined`）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

probe(() => (function () { return (function (s) { return s.raw[0]; })`a\nb`; })());
probe(() => (function () { return (function (s, v) { return s.length + ":" + v; })`x${1}y`; })());
probe(() => (function () { function tag(s, ...v) { return v.length; } return tag`${1}${2}`; })());
probe(() => (function () { function tag(s) { return s[0] === undefined; } return tag``; })());
