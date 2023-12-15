import {execSync} from 'child_process';

const dir = process.argv[2] || '.';
const pattern = '\.js$'

console.log(`uvu ${dir} ${pattern} -i book.js -i ohm.js`);
execSync(`uvu ${dir} ${pattern} -i scripts -i book.js -i ohm.js`, {stdio: 'inherit'});
