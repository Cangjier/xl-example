// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); function outer() { const inner = () => this; return inner(); } console.log(typeof outer.call({ x: 1 }) + "|" + (outer.call({ x:
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
function outer() {
  const inner = () => this;
  return inner();
}
console.log(typeof outer.call({ x: 1 }) + "|" + (outer.call({ x: 1 }).x));
