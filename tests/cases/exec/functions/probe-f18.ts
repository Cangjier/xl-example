// xl:title typeof eval
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why `eval` 这个全局名**没有那一格**（宿主能力表里没有它）⇒ `typeof eval` 给 `"undefined"`，Node 给 `"function"`。eval 是**待做项**（用户口径：要评估），现在只是没装、不是另一种口径。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof eval));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
