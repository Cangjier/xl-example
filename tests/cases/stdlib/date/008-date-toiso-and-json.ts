// xl:title Date：toISOString / toJSON / JSON.stringify 里的日期
// xl:judge stdout
// xl:end

const d = new Date(0);
console.log(d.toISOString(), d.toJSON(), JSON.stringify({ at: d }));
console.log(new Date(1600000000000).toISOString());
console.log(JSON.stringify([d]), JSON.parse(JSON.stringify(d)));
