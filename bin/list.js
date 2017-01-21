var program = require('commander');
var chalk = require('chalk');
var list = require('../lib/list');

program
    .usage('<password> [source-path]');


program.on('--help', function () {
    console.log('  Examples:');
    console.log();
    console.log(chalk.gray('    # list encrypted files and show encryption info'));
    console.log("    $ safe list 'password' /home/downloads/secret.safe");
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

/**
 * Run
 */
var run = function() {
    list(pwd, src);
};
run();

