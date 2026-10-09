// xl:title `async` 函数返回一个 thenable：会被采纳
// xl:round 682
// xl:judge stdout
// xl:end

async function adopt() { return { then(res: any) { res(41); } }; }
(async () => {
try { console.log("thenable", String(await adopt())); } catch (e) { console.log("thenable", "ERR", String(e && e.name)); }
try { console.log("await-number", String(await 7)); } catch (e) { console.log("await-number", "ERR", String(e && e.name)); }
try { console.log("await-then-chain", String((await Promise.resolve(2)) + (await Promise.resolve(3)))); } catch (e) { console.log("await-then-chain", "ERR", String(e && e.name)); }
})();
