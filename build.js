// todo: markdown?

console.time('Build time');

const pug = require('pug');
const fs = require('fs');
const rmdir = require('rimraf');

let settings = JSON.parse(fs.readFileSync('./settings.json'));

// delete everything but '.git'
makeDir(settings.output);
const pubFiles = fs.readdirSync(settings.output);
pubFiles.forEach(file => {
    if (file != '.git') rmdir.sync(settings.output + file);
});

// comics handler
makeDir(settings.comics)
fs.readdir(settings.comics, (err, comics) => {
    if (err) return console.error(err);
    // sort array from low to high
    comics.sort((a,b) => {
        const aInt = a.replace('.pug','')|0;
        const bInt = b.replace('.pug','')|0;
        return (aInt - bInt);
    });
    for (let c = 1; c <= comics.length; c++) {
        let pagination = {};
        if (c > 1) {
            pagination.disablePrev = '';
            pagination.urlFirst = '../1/';
            pagination.urlPrev = '../' + comics[c - 1].replace('.pug','') + '/';
        } else {
            pagination.disablePrev = 'disabled';
            pagination.urlFirst = '';
            pagination.urlPrev = '';
        }

        if (c < comics.length ) {
            pagination.disableNext = '';
            pagination.urlNext = '../' + comics[c + 1].replace('.pug','') + '/';
            pagination.urlLast = '../';
        } else {
            pagination.disableNext = 'disabled';
            pagination.urlNext = '';
            pagination.urlLast = '';
        }
        let paginationRendered = pug.renderFile(settings.templates + 'pagination.pug', pagination);
        let data = pug.renderFile(settings.comics + comics[c-1], {pagination: paginationRendered});
        const path = settings.output + c;

        fs.mkdirSync(path);
        fs.writeFile(path + '/index.html', data, err => {
            if (err) console.error(err);
        });

        // copying the latest comic to "index.html"
        if (c == comics.length) {
            let indexData = data.replace(/\"\.\.\//gi, '\"');
            fs.writeFile(settings.output + 'index.html', indexData, err => {
                if (err) console.error(err);
            });
        }
    }
});

// pages handler
makeDir(settings.pages);
fs.readdir(settings.pages, (err, pages) => {
    if (err) return console.error(err);
    pages.forEach(file => {
        let filename = file.replace('.pug','');
        let data = pug.renderFile(settings.pages + file);
        let path = settings.output + filename;
        fs.mkdir(path, mkdirErr => {
            if (mkdirErr) console.error(mkdirErr);
            else {
                fs.writeFile(path + '/index.html', data, err => {
                    if (err) console.error(err);
                });
            }
        });
    });
});


// assets (css, js, etc) handler
makeDir(settings.assets);
fs.mkdirSync(settings.output + 'assets/');
fs.readdir(settings.assets, (err, assets) => {
    if (err) return console.error(err);
    assets.forEach(file => {
        fs.readFile(settings.assets + file, (readFileErr, data) => {
            if (readFileErr) console.error(readFileErr);
            else {
                fs.writeFile(settings.output + 'assets/' + file, data, writeErr => {
                    if (writeErr) console.error(writeErr);
                });
            }
        });
    });
});

// images handler
makeDir(settings.images);
fs.mkdirSync(settings.output + 'images/');
fs.readdir(settings.images, (err, images) => {
    if (err) return console.error(err);
    images.forEach(file => {
        fs.readFile(settings.images + file, (readFileErr, data) => {
            if (readFileErr) console.error(readFileErr);
            else {
                fs.writeFile(settings.output + 'images/' + file, data, writeErr => {
                    if (writeErr) console.error(writeErr);
                });
            }
        });
    });
});

// static file handler, places files into top level with index.html
makeDir(settings.static);
fs.readdir(settings.static, (err, static) => {
    if (err) return console.error(err);
    static.forEach(file => {
        fs.readFile(settings.static + file, (readFileErr, data) => {
            if (readFileErr) console.error(readFileErr);
            else {
                fs.writeFile(settings.output + file, data, writeErr => {
                    if (writeErr) console.error(writeErr);
                });
            }
        });
    });
});

function makeDir(path) {
    let sepPath = path.split('/');
    let cumulativePath = './';
    for ( let p = 1; p < sepPath.length; p++) {
        cumulativePath += sepPath[p] + '/';
        if (!fs.existsSync(cumulativePath)) fs.mkdirSync(cumulativePath);
    }
}

process.on('exit', () => {
    console.timeEnd('Build time');
});

// require('readline')
//     .createInterface(process.stdin, process.stdout)
//     .question("Press [Enter] to exit...", process.exit);