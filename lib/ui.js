var chalk = require('chalk');
var clui = require('clui');
var helper = require('./helper');

var Line = clui.Line;
var Progress = clui.Progress;
var Spinner = clui.Spinner;

var overallTotal = 0;

exports.error = function(err)
{
    console.log(chalk.red(err));
};

exports.progress = function(file, fileTotal, overall, overallTotal, action, path)
{
    //process.stdout.write('\x1b[9A');
    var blankLine = new Line().fill().output();
    var progressBar = new Progress(40);

    var headers = new Line()
        .padding(2)
        .column(action, 20)
        .column( helper.centerEllipsis(path, 100), 100)
        .fill()
        .output();

    blankLine.output();

    var currentLine = new Line()
        .padding(2)
        .column('Current file', 20)
        .column(progressBar.update(file, fileTotal), 50)
        .fill()
        .output();

    var overallLine = new Line()
        .padding(2)
        .column('Overall', 20)
        .column(progressBar.update(overall, overallTotal), 50)
        .fill()
        .output();

    blankLine.output();
};

exports.spinner = function(msg)
{
    var countdown = new Spinner(msg);
    countdown.start();
    return countdown;
};