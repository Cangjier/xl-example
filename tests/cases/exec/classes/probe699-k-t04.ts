// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const log = []; class A { x = (log.push("A.x"), 1); constructor() { log.push("A.ctor"); } } class B extends A { y = (log.push("B
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const log = [];
class A { x = (log.push("A.x"), 1); constructor() { log.push("A.ctor"); } }
class B extends A { y = (log.push("B.y"), 2); constructor() { super(); log.push("B.ctor"); } }
new B();
console.log(log.join(","));
