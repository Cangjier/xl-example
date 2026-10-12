// xl:title 可选 catch 绑定与 finally
// xl:round 291
// xl:judge stdout
// xl:end

try { throw new Error("x"); } catch { console.log("caught"); } finally { console.log("fin"); }
