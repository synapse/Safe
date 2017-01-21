var program = require('commander');
var chalk = require('chalk');
var decrypt = require('../lib/decrypt');

program
    .usage('<password> [source-path] [destination-path]');


program.on('--help', function () {
    console.log('  Examples:');
    console.log();
    console.log(chalk.gray('    # decrypt'));
    console.log("    $ safe decrypt 'password' /home/downloads/secret.safe /home/downloads");
    console.log();
});


/**
 * Help
 */

var help = function() {
    program.parse(process.argv)
    if (program.args.length < 1) return program.help()
};
help();

/**
 * Settings
 */
var pwd = program.args[0];
var src = program.args[1];
var dst = program.args[2];

/**
 * Run
 */
var run = function() {
    decrypt(pwd, src, dst);
};
run();

