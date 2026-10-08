// xl:title (function () { const arr = [1, 2, 3]; const out = []; for (let i = 0; i < arr.length; i++) { if (i === 1) continue; out.push(arr[i]); } return out.join(); })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const arr = [1, 2, 3]; const out = []; for (let i = 0; i < arr.length; i++) { if (i === 1) continue; out.push(arr[i]); } return out.join(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
