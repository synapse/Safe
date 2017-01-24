var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var crypto 	= require('crypto');
var mkdirp = require('mkdirp');
var BSON = require('bson');
var helper = require('./helper');
var globals = require('./globals');


var DECRYPTION_OFFSET = 0;

var getPayload = function(path, callback)
{
	var bufferEOFSize = new Buffer.allocUnsafe(32);
	helper.getAttributes(path, function(stats){
		fs.open(path, 'r', function(err, fd) {
			if (err) throw err;

			fs.read(fd, bufferEOFSize, 0, 32, stats.size-32, function(err, nread) {
				if (err) throw err;

				var EOFSize = bufferEOFSize.readUIntBE(0, 32);
				var bufferInfo = new Buffer.alloc(EOFSize);

				// read the payload data from the end of the encrypted file
				fs.read(fd, bufferInfo, 0, EOFSize, stats.size - EOFSize - 32, function(err, nread) {
					
					// decompressing the JSON data payload
					zlib.inflate(bufferInfo, function(err, uncompressedInfo){
						if (err) throw err;

						// converting the JSON raw data to string
						var bson = new BSON();
						var payload = bson.deserialize(uncompressedInfo);

						if(typeof callback === 'function') callback(payload);
					});
				});
			});
		});
	});
};
exports.getPayload = getPayload;

var setPayload = function(path, info)
{
	var output = fs.createWriteStream(path, {'flags': 'a'});
	var bson = new BSON();
	var infoData = bson.serialize(info);

	// compress the JSON payload raw data
	zlib.deflate(infoData, function(err, infoDataCompressed){
		if (err) throw err;
		
		// get the payload size
		var len = infoDataCompressed.byteLength;
		var EOF = new Buffer.allocUnsafe(32);
		EOF.writeUIntBE(len, 0, 32);
		var wtf = EOF.readUIntBE(0,32);
		// write the payload at the end of the file
		output.write(infoDataCompressed); 
		// write the size of the payload in the last 32bit integer data
		output.write(EOF); 
		// close the data stream
		output.end();
	});
};
exports.setPayload = setPayload;

var encryptData = function(data, pass) 
{
	var IV = crypto.randomBytes(16);
	var password = new Buffer.alloc(32);
	password.write(pass, "utf-8");

  	var cipher = crypto.createCipheriv(globals.CIPHER_ALGORITHM, password, IV);
  	
  	var encrypted = cipher.update(data, 'utf8');
	encrypted += cipher.final();
  	var tag = cipher.getAuthTag();
  	
  	return {
    	content: encrypted,
    	tag: tag.toString('base64'),
    	iv: IV.toString('base64')
  	};
};

var decryptData = function(encrypted, pass, auth, iv)
{
	var password = new Buffer.alloc(32);
	password.write(pass, "utf-8");

	var decipher = crypto.createDecipheriv(globals.CIPHER_ALGORITHM, password, iv);
  	decipher.setAuthTag(auth);

  	var decrypted = decipher.update(encrypted, 'utf8');
	decrypted += decipher.final('utf8');

	return decrypted;
};

/** Encrypts a file chunck by chunk
 * src (String): 
 * dst (WriteStream):
 * relativeTo (String):
 * password (String):
 * callback (Function):
 */
exports.encryptFile = function(src, dst, relativeTo, password, progress, callback)
{
	var buffer = new Buffer(globals.CHUNK_SIZE);
	var fileInfo = {
		path: src.replace(relativeTo, ''),
		hash: null,
		size: 0,
		chunks: []
	};

	var hash = crypto.createHash('sha1');
	hash.setEncoding('hex');

	fs.open(src, 'r', function(err, fd) {
		if (err) throw err;

		var readNextChunk = function() {
	    	fs.read(fd, buffer, 0, globals.CHUNK_SIZE, null, function(err, nread) {
	      		if (err) throw err;

	      		if (nread === 0) {
	        		// done reading file, do any necessary finalization steps

	        		fs.close(fd, function(err) {
	          			if (err) throw err;
	        		});

	        		// update the file info hash
	        		fileInfo.hash = hash.digest('hex');
					
	        		if(typeof callback === 'function') callback(fileInfo);

	        		return;
	      		}

	      		var data;
	      		if (nread < globals.CHUNK_SIZE) {
	        		data = buffer.slice(0, nread);
	      		} else {
	        		data = buffer;
	      		}

	      		// do something with `data`, then call `readNextChunk();`
	      		var encryptedChunck = encryptData(data, password);

				fileInfo.size += nread;

	      		fileInfo.chunks.push({
	      			size: encryptedChunck.content.length,
					authTag: encryptedChunck.tag,
					iv: encryptedChunck.iv
	      		});

	      		// write to the destination file
				var a = encryptedChunck.content.length;
				var b = encryptedChunck.content;
	      		var written = dst.write(encryptedChunck.content);
				//dst.end();
				//fs.appendFileSync(dst, encryptedChunck.content);

	      		hash.update(data, 'utf8');
				
				// call progress
				if(typeof progress === 'function') progress(fileInfo.size, nread);

				if(written)
				{
					readNextChunk();
				}
	      		else
				{
					dst.once('drain', readNextChunk);
				}
	    	});
	  	};

	  	readNextChunk();
	});
};

/**
 * payload (Object): the object containing the encrypted file's properties and chunks
 * src (String): the encrypted file path
 * $out (String): the destionation folder path
 * password (String): the password used to encrypt the files
 */
exports.decryptFile = function(payload, src, dst, password, progress, callback)
{
	var index = 0;
	var destinationStream = null;
	var destinationPath = path.join(dst, payload.path);
	var fileProgress = 0;
	var hash = crypto.createHash('sha1');
	hash.setEncoding('hex');
	
	fs.open(src, 'r', function(err, fd) {
		if (err) throw err;

		var readNextChunk = function() {
			var length = payload.chunks[index].size;
			// empty buffer that will contain the unencrypted chunk of data
			var buffer = new Buffer(length);
			var position = DECRYPTION_OFFSET;

			fs.read(fd, buffer, 0, length, position, function(err, nread) {

				var authTag = new Buffer.from(payload.chunks[index].authTag, 'base64');
				var IV = new Buffer.from(payload.chunks[index].iv, 'base64');
				var data = decryptData(buffer, password, authTag, IV);

				// setting the decryption offset for the next file
				DECRYPTION_OFFSET += length;
				fileProgress += length;
				
				var aaa = data.length;
				if(nread > global.CHUNK_SIZE)
				{
					console.log('www');
				}

				// update the file hash
				hash.update(data, 'utf8');

				// check if file exists at the destination
				try {
    				fs.statSync(destinationPath);
  				} catch(err) {
    				if(err.code == 'ENOENT')
					{
						mkdirp.sync(path.dirname(destinationPath));
						fs.closeSync(fs.openSync(destinationPath, 'w'));
						destinationStream = fs.createWriteStream(destinationPath, {'flags': 'a'});
					}
  				}

				var written = destinationStream.write(data);

				if(typeof progress === 'function') progress(fileProgress, nread);
				
				index++;
				if(index >= payload.chunks.length)
				{
					fs.close(fd, function(err) {
						if (err) throw err;
					});

					// close the write stream
					destinationStream.end();

					// return the decrypted files hash
					if(typeof callback === 'function') callback(hash.digest('hex'));

					return;
				}

				else
				{
					if(written)
					{
						readNextChunk();
					}

					else
					{
						destinationStream.once('drain', readNextChunk);
					}
				}
			});
		};

		readNextChunk();
	});
};