// xl:title 访问器里抛出的异常沿链传出去
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { get a() { throw new RangeError("boom"); } };
try { console.log(o.a); } catch (e: any) { console.log(e.name, e.message); }
try { console.log({ ...o }); } catch (e: any) { console.log("spread", e.name); }
