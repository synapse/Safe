#!/usr/bin/env node

let Fs 		= require('fs');
let Crypto 	= require('crypto');
let Path 	= require('path');
var Zlib 	= require('zlib');
var Mkdirp 	= require('mkdirp');
var Program = require('commander');

// settings
let CHUNK_SIZE 			= 2 * 1024 * 1024; // 2MB
let CIPHER_ALGORITHM 	= 'aes-256-gcm';
let PASSWORD 			= 'hello world';
let INPUT 				= '/Users/Synapse/Downloads/test';
let OUTPUT 				= '/Users/Synapse/Downloads/encrypted.safe';
let DECRYPT 			= '/Users/Synapse/Downloads/decrypt/';
let TOTALSIZE 			= 0;
let hmac 				= Crypto.createHmac('sha512', PASSWORD);
						hmac.update(new Buffer(PASSWORD, 'utf8'));
let INFO 				= {
							files: [],
							check: hmac.digest('hex') // HMAC hash of the password
						};
let DECRYPTION_OFFSET 	= 0;

let progress = function(bytes)
{
	let progress = Math.ceil((bytes * 100) / TOTALSIZE);

	if(progress > 100) progress = 100;

	return progress + '%';
};

// let getAttributes = function(path, callback)
// {
// 	Fs.stat(path, function(err, stat) {
// 		if (err) throw err;
// 		// console.log(stat.size, Math.ceil(stat.size / CHUNK_SIZE));

// 		if(typeof callback === 'function') callback(stat);
// 	});
// };

// let getEncryptionInfo = function(path, callback)
// {
// 	let bufferEOFSize = new Buffer.allocUnsafe(32);
// 	getAttributes(path, function(stats){
// 		Fs.open(path, 'r', function(err, fd) {
// 			if (err) throw err;

// 			Fs.read(fd, bufferEOFSize, 0, 32, stats.size-32, function(err, nread) {
// 				if (err) throw err;

// 				var EOFSize = bufferEOFSize.readUIntBE(0, 32);
// 				let bufferInfo = new Buffer.alloc(EOFSize);

// 				// read the payload data from the end of the encrypted file
// 				Fs.read(fd, bufferInfo, 0, EOFSize, stats.size - EOFSize - 32, function(err, nread) {
					
// 					// decompressing the JSON data payload
// 					Zlib.inflate(bufferInfo, function(err, uncompressedInfo){
// 						if (err) throw err;

// 						// converting the JSON raw data to string
// 						let info = uncompressedInfo.toString('utf8');

// 						// try to convert the JSON string to an Object
// 						try {
// 							if(typeof callback === 'function') callback(JSON.parse(info));
// 						} catch (err) {
// 							if (err) throw err;
// 						}
// 					});
// 				});
// 			});
// 		});
// 	});
// };

// let setEncryptionInfo = function(path, info)
// {
// 	let output = Fs.createWriteStream(path, {'flags': 'a'});
// 	let infoStr = JSON.stringify(info);
// 	let infoData = Buffer.from(infoStr, 'utf8');

// 	// compress the JSON payload raw data
// 	Zlib.deflate(infoData, function(err, infoDataCompressed){
// 		if (err) throw err;
		
// 		// get the payload size
// 		let len = infoDataCompressed.byteLength;
// 		let EOF = new Buffer.allocUnsafe(32);
// 		EOF.writeUIntBE(len, 0, 32);

// 		// write the payload at the end of the file
// 		output.write(infoDataCompressed); 
// 		// write the size of the payload in the last 32bit integer data
// 		output.write(EOF); 
// 		// close the data stream
// 		output.end();
// 	});
// };

// let encryptData = function(data, pass) 
// {
// 	let IV = Crypto.randomBytes(16);
// 	let password = new Buffer.alloc(32);
// 	password.write(pass, "utf-8");

//   	let cipher = Crypto.createCipheriv(CIPHER_ALGORITHM, password, IV);
  	
//   	let encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
//   	let tag = cipher.getAuthTag();
  	
//   	return {
//     	content: encrypted,
//     	tag: tag.toString('base64'),
//     	iv: IV.toString('base64')
//   	};
// };

// let decryptData = function(encrypted, pass, auth, iv)
// {
// 	var password = new Buffer.alloc(32);
// 	password.write(pass, "utf-8");

// 	var decipher = Crypto.createDecipheriv(CIPHER_ALGORITHM, password, iv);
//   	decipher.setAuthTag(auth);

//   	var decrypted = decipher.update(encrypted, 'utf8');
// 	decrypted += decipher.final('utf8');
	  
// 	//   Buffer.concat([decipher.update(encrypted, 'hex', 'utf8'), decipher.final('utf8')]);
// 	return decrypted;
// };

/** Encrypts a file chunck by chunk
 * $in (String): 
 * $out (WriteStream):
 * relativeTo (String):
 * password (String):
 * callback (Function):
 */
// var encryptFileAtPath = function($in, $out, relativeTo, password, callback)
// {
// 	let buffer = new Buffer(CHUNK_SIZE);
// 	var fileInfo = {
// 		path: $in.replace(relativeTo, ''),
// 		hash: null,
// 		chunks: []
// 	};

// 	let hash = Crypto.createHash('sha1');
// 	hash.setEncoding('hex');

// 	Fs.open($in, 'r', function(err, fd) {
// 		if (err) throw err;

// 		let readNextChunk = function() {
// 	    	Fs.read(fd, buffer, 0, CHUNK_SIZE, null, function(err, nread) {
// 	      		if (err) throw err;

// 	      		if (nread === 0) {
// 	        		// done reading file, do any necessary finalization steps

// 	        		Fs.close(fd, function(err) {
// 	          			if (err) throw err;
// 	        		});

// 	        		// update the file info hash
// 	        		fileInfo.hash = hash.digest('hex');

// 	        		if(typeof callback === 'function') callback(fileInfo);

// 	        		return;
// 	      		}

// 	      		let data;
// 	      		if (nread < CHUNK_SIZE) {
// 	        		data = buffer.slice(0, nread);
// 	      		} else {
// 	        		data = buffer;
// 	      		}

// 	      		// do something with `data`, then call `readNextChunk();`
// 	      		let encryptedChunck = encryptData(data, password);

// 	      		fileInfo.chunks.push({
// 	      			size: encryptedChunck.content.byteLength,
// 					authTag: encryptedChunck.tag,
// 					iv: encryptedChunck.iv
// 	      		});

// 	      		// write to the destination file
// 	      		$out.write(encryptedChunck.content);

// 	      		hash.update(data, 'utf8');

// 	      		readNextChunk();
// 	    	});
// 	  	};

// 	  	readNextChunk();
// 	});
// };

/**
 * file (Object): the object containing the encrypted file's properties and chunks
 * $in (String): the encrypted file path
 * $out (String): the destionation folder path
 * password (String): the password used to encrypt the files
 */
// var decryptFileAtPath = function(file, $in, $out, password, callback)
// {
// 	let index = 0;
// 	let destinationStream = null;
// 	let destinationPath = Path.join($out, file.path);
// 	let hash = Crypto.createHash('sha1');
// 	hash.setEncoding('hex');
	
// 	Fs.open($in, 'r', function(err, fd) {
// 		if (err) throw err;

// 		let readNextChunk = function() {
// 			// empty buffer that will contain the unencrypted chunk of data
// 			let buffer = new Buffer(file.chunks[index].size);
// 			let length = file.chunks[index].size;
// 			let position = DECRYPTION_OFFSET;

// 			Fs.read(fd, buffer, 0, length, position, function(err, nread) {

// 				let authTag = new Buffer.from(file.chunks[index].authTag, 'base64');
// 				let IV = new Buffer.from(file.chunks[index].iv, 'base64');
// 				let data = decryptData(buffer, password, authTag, IV);

// 				// setting the decryption offset for the next file
// 				DECRYPTION_OFFSET += length;
				
// 				// update the file hash
// 				hash.update(data, 'utf8');

// 				// check if file exists at the destination
// 				try {
//     				Fs.statSync(destinationPath);
//   				} catch(err) {
//     				if(err.code == 'ENOENT')
// 					{
// 						Mkdirp.sync(Path.dirname(destinationPath));
// 						Fs.closeSync(Fs.openSync(destinationPath, 'w'));
// 						destinationStream = Fs.createWriteStream(destinationPath, {'flags': 'a'});
// 					}
//   				}

// 				destinationStream.write(data);
				
// 				index++;
// 				if(index >= file.chunks.length)
// 				{
// 					Fs.close(fd, function(err) {
// 						if (err) throw err;
// 					});

// 					// close the write stream
// 					destinationStream.end();

// 					// return the decrypted files hash
// 					if(typeof callback === 'function') callback(hash.digest('hex'));

// 					return;
// 				}

// 				else
// 				{
// 					readNextChunk();
// 				}
// 			});
// 		};

// 		readNextChunk();
// 	});
// };


/**
 * dir: path to the directory to explore
 * action(file, stat): called on each file or until an error occurs. file: path to the file. stat: stat of the file (retrived by fs.stat)
 * done(err): called one time when the process is complete. err is undifined is everything was ok. the error that stopped the process otherwise
 */
// let walk = function(dir, action, done) {

//     // this flag will indicate if an error occured (in this case we don't want to go on walking the tree)
//     var dead = false;

//     // this flag will store the number of pending async operations
//     var pending = 0;

//     var fail = function(err) {
//         if(!dead) {
//             dead = true;
//             done(err);
//         }
//     };

//     var checkSuccess = function() {
//         if(!dead && pending == 0) {
//             done();
//         }
//     };

//     var performAction = function(file, stat, folder) {
//         if(!dead) {
//             try {
//                 action(file, stat, folder);
//             }
//             catch(error) {
//                 fail(error);
//             }
//         }
//     };

//     // this function will recursively explore one directory in the context defined by the variables above
//     var dive = function(dir) {
//         pending++; // async operation starting after this line
//         Fs.readdir(dir, function(err, list) {
//             if(!dead) { // if we are already dead, we don't do anything
//                 if (err) {
//                     fail(err); // if an error occured, let's fail
//                 }
//                 else { // iterate over the files
// 					if(list.length > 0)
// 					{
// 						list.forEach(function(file) {
// 							if(!dead) { // if we are already dead, we don't do anything
// 								var path = Path.join(dir, file);
// 								pending++; // async operation starting after this line
// 								Fs.stat(path, function(err, stat) {
// 									if(!dead) { // if we are already dead, we don't do anything
// 										if (err) {
// 											fail(err); // if an error occured, let's fail
// 										}
// 										else {
// 											if (stat && stat.isDirectory()) {
// 												dive(path); // it's a directory, let's explore recursively
// 											}
// 											else {
// 												performAction(path, stat, false); // it's not a directory, just perform the action
// 											}
// 											pending--; checkSuccess(); // async operation complete
// 										}
// 									}
// 								});
// 							}
// 						});
// 					}

// 					else
// 					{
// 						performAction(dir, null, true);
// 					}

//                     pending--; checkSuccess(); // async operation complete
//                 }
//             }
//         });
//     };

//     // start exploration
//     dive(dir);
// };

// let encrypt = function()
// {
// 	getAttributes(INPUT, function(stats){
// 		let output = Fs.createWriteStream(OUTPUT, {'flags': 'a'});

// 		if(stats.isDirectory())
// 		{
// 			let filesList = [];

// 			let encrypt = function(index)
// 			{
// 				encryptFileAtPath(filesList[index], output, INPUT, PASSWORD, function(file){
// 					INFO.files.push(file);

// 					// continue to encrypt the next file
// 					if(index < filesList.length - 1)
// 					{
// 						index++;
// 						encrypt(index);						
// 					}

// 					// finished encrypting exit
// 					else 
// 					{
// 						// add the payload to the encrypted file
// 						setEncryptionInfo(OUTPUT, INFO);
// 					}
// 				});
// 			}

// 			walk(INPUT, function(path, stat, folder){
// 				console.log(path, folder);
// 				// if it's an empty folder just add it the payload
// 				if(folder)
// 				{
// 					INFO.files.push({path: path.replace(INPUT, '')})
// 				}

// 				else
// 				{
// 					filesList.push(path);
// 					TOTALSIZE += stat.size;
// 				}
// 			}, function(){
// 				console.log('Done');
// 				console.log('Files', filesList.length, TOTALSIZE/1024/1024);

// 				encrypt(0);
// 			});
// 		}

// 		else
// 		{
// 			encryptFileAtPath(INPUT, output, Path.dirname(INPUT), PASSWORD, function(file){
// 				INFO.files.push(file);
// 				setEncryptionInfo(OUTPUT, INFO);
// 			});
// 		}
// 	});
// };

let decrypt = function()
{
	getEncryptionInfo(OUTPUT, function(info){
		// console.log(info);
		let index = 0;

		let nextFile = function()
		{
			let file = info.files[index];
			index++;

			// if it's a file then decrypt it
				if(typeof file.chunks !== 'undefined')
			{
				//                 file            $in      $out   password     
				decryptFileAtPath(file, OUTPUT, DECRYPT, PASSWORD, function(){
					console.log('Decryption of file finished');
					// if the decryption ended pass to the next file
					if(index < info.files.length) nextFile();
				});
			}

			// else just replicate the empty folder
			else
			{
				// create the folder relative to the desti
				Mkdirp.sync(Path.join(DECRYPT, file.path));
				// if the decryption ended pass to the next file
				if(index < info.files.length) nextFile();
			}
		};

		nextFile();
	});
};
