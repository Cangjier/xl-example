// xl:title async 返回 thenable / await 非承诺值
// xl:round 682
// xl:judge stdout
// xl:end
async function adopt() { return { then(res: any) { res(41); } }; }
(async () => {
try { console.log("thenable", String(await adopt())); } catch (e) { console.log("thenable", "ERR", String(e && e.name)); }
try { console.log("await-number", String(await 7)); } catch (e) { console.log("await-number", "ERR", String(e && e.name)); }
try { console.log("await-then-chain", String((await Promise.resolve(2)) + (await Promise.resolve(3)))); } catch (e) { console.log("await-then-chain", "ERR", String(e && e.name)); }
})();
