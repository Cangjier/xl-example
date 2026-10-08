// xl:title `Math` 那一族的名字与长度（宿主引用那一档）
// xl:round 719
// xl:judge stdout
// xl:want differ
// xl:why `Math` 那一族的**名字与形参个数**取不到：`Math.max.length` 在 Node 里是 `2`、`Math.random.name` 是 `"random"`，本仓给 `undefined`。根子在**内建是一个宿主引用值、它身上没有属性表**——要给几百个内建各配一份「名字 + 形参个数」表。与 `stdlib/round709/p709b-b17` / `p709b-b18`、`stdlib/object/122-names-function-proto`、`exec/round706/p706c-x20` **同一条根**，这一条只是同一族上再钉一格（形状那一行是过的，差的是那两格）。要做。
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => typeof Math.max + "|" + typeof Math.random + "|" + typeof Math.f16round));
console.log(t(() => (Math as any).max.length + "|" + (Math as any).random.name));
