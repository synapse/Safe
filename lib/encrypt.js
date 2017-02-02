var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var safe = require('./safe');
var walker = require('./walker');
var helper = require('./helper');
var globals = require('./globals');
var ui = require('./ui');

var INFO = {
    files: [],
	totalSize: 0,
	date: new Date()
};

var proceed = function(src, dst)
{
	// check if source path exists
	if(!fs.existsSync(src))
	{
		console.log(chalk.red('Source path was not found! Please make sure that the source path is correct.'));
		return false;
	}

	// check if the destination path already exists
	// we don't want to overwrite some random file
	if(fs.existsSync(dst))
	{
		console.log(chalk.red('Wrong destionation path! Please make sure that the destination path points to an unexisting file.'));
		return false;
	}

	return true;
};

module.exports = function(pwd, src, dst) 
{
	if(!proceed(src, dst)) return;

	helper.getAttributes(src, function(stats){
		var destination = fs.createWriteStream(dst, {'flags': 'a'});

		var overall = 0;

        // if the source is a folder
		if(stats.isDirectory())
		{
			var filesList = [];

			var encrypt = function(index)
			{
				// reset the progress
				var fileStat = fs.statSync(filesList[index]);
				ui.progress(0, fileStat.size, overall, INFO.totalSize, 'Encrypting', src);

				safe.encryptFile(filesList[index], destination, src, pwd, function(overallBytes, currentBytes){
					overall += currentBytes;
					ui.progress(overallBytes, fileStat.size, overall, INFO.totalSize, 'Encrypting', src);
				}, function(file){
					INFO.files.push(file);

					// continue to encrypt the next file
					if(index < filesList.length - 1)
					{
						index++;
						encrypt(index);						
					}

					// finished encrypting exit
					else 
					{
						// add the payload to the encrypted file
						destination.end();
						safe.setPayload(dst, INFO, pwd);
					}
				});
			};

			var spinner = ui.spinner('Indexing files...');

			walker(src, function(wPath, stat, folder){
				if(globals.IGNORE.indexOf(path.basename(wPath)) > -1) return;

				// if it's an empty folder just add it the payload
				if(folder)
				{
					INFO.files.push({path: wPath.replace(src, '')});
				}

				else
				{
					filesList.push(wPath);
					INFO.totalSize += stat.size;
				}
			}, function(){
				spinner.stop();
				// console.log('Done');
				// console.log('Files', filesList.length, TOTALSIZE/1024/1024);
				encrypt(0);
			});
		}

        // if the source is a file
		else
		{
			safe.encryptFile(src, destination, path.dirname(src), pwd, function(){
				
			}, function(file){
				INFO.files.push(file);
				safe.setPayload(dst, INFO);
			});
		}
	});
};