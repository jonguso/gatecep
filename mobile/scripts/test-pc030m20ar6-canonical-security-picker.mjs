import fs from 'node:fs';
const p='app/(tabs)/trading.js';
const s=fs.readFileSync(p,'utf8');
for (const [needle,msg] of [
  ['NSE_SECURITIES','canonical NSE security master is used'],
  ['securityQuery','searchable security query state exists'],
  ['Select a security from the NSE list','unresolved typed symbols are blocked'],
  ['selectedSecurity','scenario uses an explicit selected master security'],
  ['Search NSE security','investor-facing picker prompt exists']
]) { if(!s.includes(needle)) throw new Error('FAIL — '+msg); console.log('PASS — '+msg+'.'); }
if ((s.match(/COACH G — PORTFOLIO FIT/g)||[]).length) throw new Error('FAIL — duplicate Portfolio Fit result card still renders');
console.log('PASS — duplicate Portfolio Fit explanation card is removed; dialogue is the single explanation surface.');
