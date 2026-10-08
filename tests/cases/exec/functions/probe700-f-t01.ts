// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const log = []; function f(a = log.push("a"), b = log.push("b")) { log.push("body"); } f(); console.log(log.join(","));
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const log = [];
function f(a = log.push("a"), b = log.push("b")) { log.push("body"); }
f();
console.log(log.join(","));
