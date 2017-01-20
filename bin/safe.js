#!/usr/bin/env node

var program = require('commander');

program.version(require('../package').version)
    .usage('<command> [options]')
    .command('encrypt', 'encrypt a file or a folder')
    .command('decrypt', 'decrypt a `.safe` file')
    .command('list', 'list contents of an encrypted file (only if the payload is public)')
    .parse(process.argv);