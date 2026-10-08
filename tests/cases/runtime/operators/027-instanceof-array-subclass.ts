// xl:title extends Array：instanceof 两条链都对
// xl:judge stdout
// xl:end

class MyList extends Array {}
const m = new MyList();
m.push(1);
console.log(m instanceof MyList, m instanceof Array, m.length, Array.isArray(m));
