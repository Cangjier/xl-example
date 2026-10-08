// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show(new Boolean(false)) + "|" + show(!!new Boolean(false)) + "|" + show(new Boolean(false) == false));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show(new Boolean(false)) + "|" + show(!!new Boolean(false)) + "|" + show(new Boolean(false) == false));
