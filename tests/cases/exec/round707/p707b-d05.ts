// xl:title writable false 之后写入静默
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

"use strict" === "" ;
const o = {}; Object.defineProperty(o, "x", { value: 1, writable: false });
run(() => { o.x = 2; console.log(show(o.x)); });
