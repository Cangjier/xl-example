// xl:title (class { #p = 1; get() { return this.#p; } }).prototype.get.call({})
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 私有名在本仓是**同键的普通属性**（第 195 轮的口径），没有「真私有」那一层：`Box.prototype.get.call({})` 读不到 `#v` 时给 `undefined`，JS 给 `TypeError`（品牌检查）。与 `exec/decorators-modifiers/057-private-brand` **同一条根**。口径级待做项。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((class { #p = 1; get() { return this.#p; } }).prototype.get.call({})));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
