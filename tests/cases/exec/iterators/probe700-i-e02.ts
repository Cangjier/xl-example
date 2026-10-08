// xl:title [...new Map([['a', 1]])].map(e => e.join(':')).join(',')
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show([...new Map([['a', 1]])].map(e => e.join(':')).join(',')));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
