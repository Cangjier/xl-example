// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show([1, 2] == "1,2") + "|" + show([null] == "") + "|" + show([undefined] == ""));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show([1, 2] == "1,2") + "|" + show([null] == "") + "|" + show([undefined] == ""));
