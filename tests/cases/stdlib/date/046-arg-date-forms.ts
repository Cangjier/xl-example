// xl:title 边界：Date.UTC / toISOString / ISO 解析
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("utc", String(Date.UTC(2020, 0, 1))); } catch (e) { console.log("utc", "ERR", String(e && e.name)); }
try { console.log("iso", String(new Date(0).toISOString())); } catch (e) { console.log("iso", "ERR", String(e && e.name)); }
try { console.log("parse-iso", String(new Date('2020-01-02T03:04:05.000Z').getTime())); } catch (e) { console.log("parse-iso", "ERR", String(e && e.name)); }
try { console.log("utc-getters", String([new Date(0).getUTCFullYear(), new Date(0).getUTCMonth(), new Date(0).getUTCDate()].join(','))); } catch (e) { console.log("utc-getters", "ERR", String(e && e.name)); }
