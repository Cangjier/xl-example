// xl:title (class { #p = 1; get() { return this.#p; } }) && "ok"
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((class { #p = 1; get() { return this.#p; } }) && "ok"));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
