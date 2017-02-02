var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var chalk = require('chalk');
var safe = require('./safe');
var ui = require('./ui');

var errors = [];

var proceed = function(src, dst)
{
	// check if source path exists
	if(!fs.existsSync(src))
	{
		console.log(chalk.red('Source path was not found! Please make sure that the source path is correct.'));
		return false;
	}

	// check if the source path is a file
	var srcStat = fs.statSync(src);
	if(!srcStat.isFile())
	{
		console.log(chalk.red('Source path must be a file!'));
		return false;
	}

	return true;
}

module.exports = function(pwd, src, dst)
{
	if(!proceed(src, dst)) return;

	safe.getPayload(src, pwd, function(info){
		var index = 0;
		var overall = 0;

		var nextFile = function()
		{
			var file = info.files[index];
			index++;

			// if it's a file then decrypt it
            if(typeof file.chunks !== 'undefined')
			{
				// reset the progress
				ui.progress(0, file.size, overall, info.totalSize, 'Decrypting', file.path);

				safe.decryptFile(file, src, dst, pwd, function(overallBytes, currentBytes){
					overall += currentBytes;
					ui.progress(overallBytes, file.size, overall, info.totalSize, 'Decrypting', file.path);
				}, function(hash){
					
					if(hash != file.hash)
					{
						errors.push({
							title: chalk.red.bold('File integrity check: ') + chalk.red.inverse(' MISMATCH ') + '  ' + file.path,
							message: chalk.green(file.hash) + ' != ' + chalk.red(hash)
						});
					}

					// if the decryption ended pass to the next file
					if(index < info.files.length) 
					{
						nextFile();
					}

					// else print the errors if any
					else 
					{
						if(errors.length)
						{
							errors.forEach(function(error){
								console.log(error.title);
								console.log(error.message);
								console.log();
							});
						}
					}
				});
			}

			// else just replicate the empty folder
			else
			{
				// create the folder relative to the desti
				mkdirp.sync(path.join(dst, file.path));
				// if the decryption ended pass to the next file
				if(index < info.files.length) nextFile();
			}
		};

		nextFile();
	});
};