// xl:title lookupGetter 自己的名字与长度
// xl:round 706
// xl:judge stdout
// xl:want differ
// xl:why 宿主引用那两档（HostRef / 带可调用载荷的对象）没有 name / length 两格：本仓只给闭包（Arity / Name）与内建构造挂过，Object.prototype 上这一族（hasOwnProperty / __lookupGetter__ …）都取不到。与 122-names-function-proto 是同一族的缺口。
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Object.prototype.__lookupGetter__.name) + "," + show(Object.prototype.__lookupGetter__.length));
