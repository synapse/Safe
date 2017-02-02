var chalk = require('chalk');
var safe = require('./safe');
var helper = require('./helper');

module.exports = function(pwd, src, dst)
{
    var total = 0;
    safe.getPayload(src, pwd, function(info){
        console.log('\033');
        for(var i = 0; i < info.files.length; i++)
        {
            console.log(
                chalk.white(info.files[i].path) + '   [' + 
                (
                    typeof info.files[i].chunks === 'undefined' ? chalk.green.bold('folder') : chalk.green.bold( helper.formatBytes(info.files[i].size) )
                ) +
                
                (
                    typeof info.files[i].chunks !== 'undefined'? '] - SHA1:' +
                    (typeof info.files[i].chunks === 'undefined' ? '' : chalk.green.bold(info.files[i].hash))
                    : ']'
                )
            );

            if(typeof info.files[i].chunks !== 'undefined')
            {
                total +=info.files[i].size;
            }
        }

        console.log();
        console.log();
        console.log(
            'Total size:   ' +
            chalk.cyan.bold(helper.formatBytes(total))
        );
        console.log(
            'Created on:   ' +
            chalk.cyan.bold(info.date)
        );
    });
};