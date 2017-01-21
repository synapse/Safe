var fs = require('fs');

exports.getAttributes = function(path, callback)
{
	fs.stat(path, function(err, stat) {
		if (err) throw err;
		if(typeof callback === 'function') callback(stat);
	});
};

exports.formatBytes = function(bytes,decimals) 
{
	if(bytes == 0) return '0 Bytes';
	var k = 1000,
		dm = decimals + 1 || 3,
		sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
		i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

exports.centerEllipsis = function(fullStr, strLen, separator) 
{
    if (fullStr.length <= strLen) return fullStr;

    separator = separator || '...';

    var sepLen = separator.length,
        charsToShow = strLen - sepLen,
        frontChars = Math.ceil(charsToShow/2),
        backChars = Math.floor(charsToShow/2);

    return fullStr.substr(0, frontChars) + 
           separator + 
           fullStr.substr(fullStr.length - backChars);
};