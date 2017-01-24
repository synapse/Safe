var path = require('path');
var mkdirp = require('mkdirp');
var chalk = require('chalk');
var safe = require('./safe');
var ui = require('./ui');

module.exports = function(pwd, src, dst)
{
	safe.getPayload(src, function(info){
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
						console.log(chalk.red.bold('File integrity check: ') + chalk.red.inverse(' MISMATCH ') + '  ' + file.path);
						console.log(chalk.green(file.hash) + ' != ' + chalk.red(hash));
						console.log();
					}

					// if the decryption ended pass to the next file
					if(index < info.files.length) nextFile();
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