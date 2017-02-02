var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var crypto 	= require('crypto');
var mkdirp = require('mkdirp');
var BSON = require('bson');
var helper = require('./helper');
var globals = require('./globals');
var DECRYPTION_OFFSET = 0;

/** Reads the payload from the end of the encrypted file
 * path (String): path of the encrypted file
 * callback (Function): callback function to be called after the payload wa retrieved
 */
var getPayload = function(path, pass, callback)
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

						var password = new Buffer.alloc(32);
						password.write(pass, "utf-8");
						var cipher = crypto.createDecipher('aes-256-cbc', password);

						var decInfoData = Buffer.concat([cipher.update(uncompressedInfo), cipher.final()]);

						// converting the JSON raw data to string
						var bson = new BSON();
						var payload = bson.deserialize(decInfoData);

						if(typeof callback === 'function') callback(payload);
					});
				});
			});
		});
	});
};
exports.getPayload = getPayload;

/** Writes the payload at the end of the encrypted file
 * path (String): path of the encrypted file
 * info (Object): the payload object
 */
var setPayload = function(path, info, pass)
{
	var output = fs.createWriteStream(path, {'flags': 'a'});
	var bson = new BSON();
	var infoData = bson.serialize(info);
	
	var password = new Buffer.alloc(32);
	password.write(pass, "utf-8");
	var cipher = crypto.createCipher('aes-256-cbc', password);

	var encInfoData = Buffer.concat([cipher.update(infoData), cipher.final()]);

	// compress the JSON payload raw data
	zlib.deflate(encInfoData, function(err, infoDataCompressed){
		if (err) throw err;
		
		// get the payload size
		var len = infoDataCompressed.byteLength;
		var EOF = new Buffer.allocUnsafe(32);
		EOF.writeUIntBE(len, 0, 32);
		var wtf = EOF.readUIntBE(0,32);
		// write the payload at the end of the file
		output.write(infoDataCompressed, 'binary'); 
		// write the size of the payload in the last 32bit integer data
		output.write(EOF, 'binary'); 
		// close the data stream
		output.end();
	});
};
exports.setPayload = setPayload;

/** Encrypts a chunck of data
 * data (Buffer): the data to be encrypted
 * pass (String): password as string
 */
var encryptData = function(data, pass) 
{
	var IV = crypto.randomBytes(16);
	var password = new Buffer.alloc(32);
	password.write(pass, "utf-8");

  	var cipher = crypto.createCipheriv(globals.CIPHER_ALGORITHM, password, IV);

	var encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  	var tag = cipher.getAuthTag();

  	return {
    	content: encrypted,
		tag: tag.toString('hex'),
    	iv: IV.toString('hex')
  	};
};

/** Decrypts a chunk of data
 * encrypted (Buffer): the encrypted data chunk
 * password (String): password as string
 * auth (Buffer): the auth tag for the GCM check
 * iv (Buffer): the IV used for the encryption
 */
var decryptData = function(encrypted, pass, auth, iv)
{
	var password = new Buffer.alloc(32);
	password.write(pass, "utf-8");

	var decipher = crypto.createDecipheriv(globals.CIPHER_ALGORITHM, password, iv);
  	decipher.setAuthTag(auth);

  	var decrypted = Buffer.concat([decipher.update(encrypted),decipher.final()]);

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


	// fs.open(src, 'r', function(err, fd) {
	// 	if (err) throw err;
	var reader = fs.createReadStream(src, {highWaterMark: globals.CHUNK_SIZE});

	reader.on('data', function(data) {
		// do something with `data`, then call `readNextChunk();`
		var encryptedChunck = encryptData(data, password);

		fileInfo.size += data.byteLength;
		
		fileInfo.chunks.push({
			size: encryptedChunck.content.length,
			authTag: encryptedChunck.tag,
			iv: encryptedChunck.iv
		});

		// write to the destination file
		var written = dst.write(encryptedChunck.content);

		hash.update(data, 'utf8');
		
		// call progress
		if(typeof progress === 'function') progress(fileInfo.size, data.byteLength);
	});

	reader.on('end', function(){
		// update the file info hash
		fileInfo.hash = hash.digest('hex');
			
		if(typeof callback === 'function') callback(fileInfo);
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
	
	var nextChunk = function() 
	{
		if(index >= payload.chunks.length)
		{
			// close the write stream
			destinationStream.end();

			// return the decrypted files hash
			if(typeof callback === 'function') callback(hash.digest('hex'));
		}

		else
		{
			var length = payload.chunks[index].size;
			var authTag = new Buffer.from(payload.chunks[index].authTag, 'hex');
			var IV = new Buffer.from(payload.chunks[index].iv, 'hex');
			var reader = fs.createReadStream(src, {start: DECRYPTION_OFFSET, highWaterMark: length});

			reader.on('data', function(buffer){
				reader.pause();
				var data = decryptData(buffer, password, authTag, IV);

				// setting the decryption offset for the next file
				DECRYPTION_OFFSET += buffer.length;
				fileProgress += buffer.length;
				
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

				var written = destinationStream.write(data, 'binary');

				if(typeof progress === 'function') progress(fileProgress, buffer.byteLength);

				index++;
				//reader.destroy();
				if(written)
				{	
					reader.push(null);
					nextChunk();
				}

				else
				{
					destinationStream.once('drain', function(){
						nextChunk();
					});
					reader.push(null);
				}	
			});
		}
	};

	nextChunk();
};