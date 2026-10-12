// xl:title `Object.prototype.toString`：默认标签表与 `Symbol.toStringTag` 的覆盖
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe-j08 · probe-j23 · probe693-o33 · probe703-o-a32 · probe704-o-d23
//   ＋ `009-object-tostring-tag` / `027-object-tostring-tags-root` / `041-object-tostring-and-tag`
//     / `060-object-tostring-in-template` / `073-object-tostring-not-shadowed` / `086-object-tostring-tags-r371`
//     / `090-object-tostring-on-builtins` / `134-object-tostring-boxed` / `135-object-call-boxed`
//     / `136-object-tostring-box-override` / `137-object-create-is-not-box` / `138-object-tostring-arguments`
//     / `167-array-species-tostring` / `171-tostring-tag-symbol`
//
// 判定点只有一个：**标签从哪儿来**——
//  ① 默认表：`[object Object]` / `[object Array]` / `[object Function]` / `[object Null]` /
//     `[object Undefined]` / `[object String]` / `[object Number]` / `[object Boolean]` /
//     `[object Symbol]` / `[object Arguments]`；
//  ② 箱（`new String` 一类）走自己的那一档，但 `Object.create(Number.prototype)` **不是**箱；
//  ③ 自己带 `Symbol.toStringTag` 时**它说了算**（普通对象也盖得掉）；
//  ④ `Object.prototype.toString` 不被 `Function.prototype.toString` 遮住（函数自己那一格是另一件事）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const tag = (v: any): string => Object.prototype.toString.call(v);

try {
  console.log(show(tag({})));
  console.log(show(tag([])));
  console.log(show(tag(function () {})));
  console.log(show(tag(null)));
  console.log(show(tag(undefined)));
  console.log(show(tag("a")));
  console.log(show(tag(1)));
  console.log(show(tag(true)));
  console.log(show(tag(Symbol("x"))));
  console.log(show(tag((function () { return arguments; })())));
  console.log(show(typeof Object.prototype));
  console.log(show(typeof Object.create(null).toString));
  console.log(show(tag(Object.create(Number.prototype))));
  console.log(show(tag(new String("ab"))));
  console.log(show(tag(Object(1))));
  console.log(show(tag({ [Symbol.toStringTag]: "X" })));
  console.log(show(typeof Object.prototype.toString));
  console.log(show(({}) + ""));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
