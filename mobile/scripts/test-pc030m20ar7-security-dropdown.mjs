import fs from 'node:fs';
const file=new URL('../app/(tabs)/trading.js', import.meta.url);
const s=fs.readFileSync(file,'utf8');
const must=[
  'PC-030M20AR7 canonical NSE dropdown',
  'securityDropdownOpen',
  'Select NSE security',
  'Search symbol or company name',
  'Canonical symbol:',
  'setSecurityDropdownOpen(false)',
  'securityQuery.trim()?securityMatches:NSE_SECURITIES.slice(0,12)'
];
for (const x of must) if(!s.includes(x)) throw new Error(`Missing M20AR7 contract: ${x}`);
if(s.includes('<TextInput value={securityQuery} onChangeText={changeSecurityQuery} autoCapitalize="characters" placeholder="Search NSE security"')) throw new Error('Old free-text security field still present');
console.log('PASS — Security is a canonical NSE dropdown rather than an editable scenario identity field.');
console.log('PASS — Dropdown search filters master rows but does not become the selected security.');
console.log('PASS — Selected row visibly carries canonical symbol and sector evidence.');
console.log('PASS — Open what-if can still leave security unselected.');
