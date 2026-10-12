// xl:title catch 的绑定形态：带参 / 省略参数 / 参数是解构 / 类型位
// xl:round 7
// xl:judge stdout
// xl:end

try { throw new Error("a"); } catch (e) { console.log("one:" + (e as Error).message); }
try { throw 1; } catch { console.log("two"); }
try { throw { code: 7 }; } catch ({ code }: any) { console.log("three:" + code); }
try { throw "s"; } catch (e: any) { console.log("four:" + typeof e); }
