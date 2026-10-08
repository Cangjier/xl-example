// xl:title new Date(ms) / getTime / valueOf / 算术
// xl:judge stdout
// xl:end

const d = new Date(1000);
console.log(d.getTime(), d.valueOf(), +d, d.getTime() === 1000);
console.log(new Date(0).getTime(), new Date(1500).getTime() - new Date(500).getTime());
