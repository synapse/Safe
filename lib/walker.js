var fs = require('fs');
var path = require('path');

/**
 * dir: path to the directory to explore
 * action(file, stat): called on each file or until an error occurs. file: path to the file. stat: stat of the file (retrived by fs.stat)
 * done(err): called one time when the process is complete. err is undifined is everything was ok. the error that stopped the process otherwise
 */
module.exports = function(dir, action, done) {

    // this flag will indicate if an error occured (in this case we don't want to go on walking the tree)
    var dead = false;

    // this flag will store the number of pending async operations
    var pending = 0;

    var fail = function(err) {
        if(!dead) {
            dead = true;
            done(err);
        }
    };

    var checkSuccess = function() {
        if(!dead && pending == 0) {
            done();
        }
    };

    var performAction = function(file, stat, folder) {
        if(!dead) {
            try {
                action(file, stat, folder);
            }
            catch(error) {
                fail(error);
            }
        }
    };

    // this function will recursively explore one directory in the context defined by the variables above
    var dive = function(dir) {
        pending++; // async operation starting after this line
        fs.readdir(dir, function(err, list) {
            if(!dead) { // if we are already dead, we don't do anything
                if (err) {
                    fail(err); // if an error occured, let's fail
                }
                else { // iterate over the files
					if(list.length > 0)
					{
						list.forEach(function(file) {
							if(!dead) { // if we are already dead, we don't do anything
								var pth = path.join(dir, file);
								pending++; // async operation starting after this line
								fs.stat(pth, function(err, stat) {
									if(!dead) { // if we are already dead, we don't do anything
										if (err) {
											fail(err); // if an error occured, let's fail
										}
										else {
											if (stat && stat.isDirectory()) {
												dive(pth); // it's a directory, let's explore recursively
											}
											else {
												performAction(pth, stat, false); // it's not a directory, just perform the action
											}
											pending--; checkSuccess(); // async operation complete
										}
									}
								});
							}
						});
					}

					else
					{
						performAction(dir, null, true);
					}

                    pending--; checkSuccess(); // async operation complete
                }
            }
        });
    };

    // start exploration
    dive(dir);
};