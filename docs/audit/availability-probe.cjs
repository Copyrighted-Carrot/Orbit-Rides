const fs = require('fs');
const vm = require('vm');
const root = require('path').resolve(__dirname, '../..');
const ts = require(root + '/node_modules/typescript');
let response = {data: [], error: null};
let reads = 0;
const query = {
  select() {return this;}, eq() {return this;},
  in() {reads++; return Promise.resolve(response);}
};
const mod = {exports: {}};
const code = ts.transpileModule(fs.readFileSync(root + '/lib/util/availability.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017}
}).outputText;
vm.runInNewContext(code, {
  module: mod, exports: mod.exports,
  require: () => ({createClient: async () => ({from: () => query})}), Date
});
const cases = [
  {name: 'malformed requested date', date: 'invalid', data: []},
  {name: 'unparseable requested date', date: 'nope - wrong', data: []},
  {name: 'reversed requested range', date: 'Oct 30, 2026 - Oct 28, 2026', data: []},
  {name: 'database read fails', date: 'Oct 28, 2026 - Oct 30, 2026', data: null, error: {message: 'test failure'}},
  {name: 'visible overlapping booking', date: 'Oct 28, 2026 - Oct 30, 2026', data: [{id:1, date_range: 'Oct 28, 2026 - Oct 30, 2026', status:'confirmed'}]},
  {name: 'invalid stored booking date', date: 'Oct 28, 2026 - Oct 30, 2026', data: [{id:1, date_range: 'invalid', status:'confirmed'}]},
  {name: 'same-day existing and requested range', date: 'Oct 28, 2026 - Oct 28, 2026', data: [{id:1, date_range: 'Oct 28, 2026 - Oct 28, 2026', status:'confirmed'}]}
];
(async () => {
  const results = [];
  for (const test of cases) {
    response = {data: test.data, error: test.error || null};
    reads = 0;
    results.push({case: test.name, ...(await mod.exports.checkCarAvailability(1, test.date)), databaseReads: reads});
  }
  console.log(JSON.stringify(results, null, 2));
})();
