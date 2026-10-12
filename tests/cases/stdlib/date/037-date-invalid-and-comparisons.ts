// xl:title Date 的非法值与比较：NaN 时间、toISOString 抛、差值比较
// xl:judge stdout
// xl:end

const bad = new Date(NaN);
console.log(bad.getTime(), Number.isNaN(bad.getTime()));
try { bad.toISOString(); } catch (e) { console.log("range:" + (e as Error).name); }
console.log(new Date(1000) < new Date(2000), new Date(2000) - new Date(1000), +new Date(0));
