// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show(String.raw`a\nb`) + "|" + show(String.raw({ raw: ["x", "y"] }, 1)));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show(String.raw`a\nb`) + "|" + show(String.raw({ raw: ["x", "y"] }, 1)));
