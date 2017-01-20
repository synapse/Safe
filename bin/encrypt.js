var program = require('commander');
var chalk = require('chalk');
var encrypt = require('../lib/encrypt');

program
    .usage('<password> [source-path] [destination-path]')
    .option('-h, --hide', 'hide list');


program.on('--help', function () {
    console.log('  Examples:');
    console.log();
    console.log(chalk.gray('    # encrypt a single file'));
    console.log("    $ safe encrypt 'password' /home/downloads/secret.pdf /home/downloads/secret.safe");
    console.log();
    console.log(chalk.gray('    # encrypt a folder and all files recursively'));
    console.log("    $ safe encrypt 'password' /home/downloads/secret-folder /home/downloads/mydocs.safe");
    console.log();
    console.log(chalk.gray('    # encrypt and hide the files list'));
    console.log("    $ safe encrypt 'password' /home/downloads/secret.pdf /home/downloads/secret.safe -h");
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
var hid = program.hide || false;

/**
 * Run
 */
var run = function() {
    console.log(pwd, src, dst, hid);
};
run();

