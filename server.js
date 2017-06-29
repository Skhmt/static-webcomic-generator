// Usage: node server.js --port [port] --cors --gz --https [keypath] [certpath] -dir [folder]

/*jshint
  esversion: 6,
  node: true
*/

const url = require('url');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let port = 80;
let dir = '/public/';
let cors = false;
let gz = false;
let https = false;
let httpsKeypath = '';
let httpsCertpath = '';

for (let i = 0; i < args.length; i++) {
    switch(args[i]) {
        case '--port':
            if (typeof args[i+1] == 'string') {
                port = args[i+1]|0;
            } else console.error('bad syntax');
            break;
        case '--dir':
            if (typeof args[i+1] == 'string') {
                dir = `/${args[i+1]}`;
            } else console.error('bad syntax');
            break;
        case '--cors':
            cors = true;
            break;
        case '--gz':
            gz = true;
            break;
        case '--https':
            if (typeof args[i+1] == 'string' && typeof args[i+2] == 'string') {
                https = true;
                httpsKeypath = args[i+1];
                httpsCertpath = args[i+2];
                if (port == 80) port = 443;
            } else console.error('bad syntax');
        default:
            break;
    } // end switch
}

let error404;
fs.readFile(`.${dir}/404.html`, (err, data) => {
    if (!err) error404 = data;
    else error404 = '404: File not found';
});

let error500;
fs.readFile(`.${dir}/500.html`, (err, data) => {
    if (!err) error500 = data;
    else error500 = '500: Internal server error';
});

let server;
if (https) {
    server = require('https').createServer({
        key: fs.readFileSync(httpsKeypath),
        cert: fs.readFileSync(httpsCertpath)
    }, reqHandler);
}
else server = require('http').createServer(reqHandler);

server.listen(port, () => {
    console.log(`${c.gi('Server listening at:')} ${https?'https':'http'}://${getIP()}:${port}`);
    console.log(`${c.gi('Public directory at:')} ${dir}`);
    if (gz||cors||https) console.log(`${c.gi('Options:')} ${gz?'gzip ':''}${cors?'CORS ':''}${https?'HTTPS ':''}`);
    console.log(`Press ${c.ri('Ctrl+C')} to exit`);
}).on('error', err => {
    if (err.code === 'EADDRINUSE') {
        console.log(c.ri('Port ' + err.port + ' already in use!'));
    } else {
        console.log(c.ri('Error: ' + err.code));
    }
});

function reqHandler(req, res) {
    const date = new Date();
    const status1 = `\n[${c.ci(date.toLocaleTimeString())}][${c.ci(date.toLocaleDateString())}] ` +
        `${c.yi(req.headers.host)} `;
    const status2 = ` ${c.mi(req.method)} ${c.mi(req.url)}\n${c.bi(req.headers["user-agent"])}`;

    // parse URL
    const parsedUrl = url.parse(req.url).pathname;
    // extract URL path
    let pathname = `.${dir}${parsedUrl}`;
    // based on the URL path, extract the file extention. e.g. .js, .doc, ...
    let ext = path.parse(pathname).ext;

    // if is a directory search for index file matching the extension
    try {
        if (fs.statSync(pathname).isDirectory()) {
            pathname += '/index.html';
            ext = '.html';
        }
    } catch (err) {
        // 
    }

    const acceptgzip = req.headers['accept-encoding'].split(', ').includes('gzip');

    if (gz && acceptgzip) {
        let gzpath = pathname + '.gz';
        read(gzpath, res, gzStatus => {
            if (gzStatus.code == 200) {
                res.setHeader('Content-Encoding', 'gzip');
                code200(res, gzStatus.data, ext, cors);
            }
            else {
                read(pathname, res, pathStatus => {
                    if (pathStatus.code == 200) code200(res, pathStatus.data, ext, cors);
                    else if (pathStatus.code == 404) code404(res);
                    else code500(res);
                });
            }
        });
    }
    else {
        read(pathname, res, readStatus => {
            if (readStatus.code == 200) code200(res, readStatus.data, ext, cors);
            else if (readStatus.code == 404) code404(res);
            else code500(res);
        });
    }

    function read(pathname, res, callback) {
        fs.readFile(pathname, (err, data) => {
            if (err) {
                if (err.code == 'ENOENT') callback({code:404});
                else return callback({code:500});
            }
            else {
                return callback({code:200, data});
            }
        });
    }

    function setCORS(res) {
         // Website you wish to allow to connect
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);
    }

    function code404(res) {
        res.statusCode = 404;
        res.end(error404);
        console.log(status1 + c.rbi(c.k('404')) + status2);
    }

    function code500(res) {
        res.statusCode = 500;
        res.end(error500);
        console.log(status1 + c.rbi(c.k('500')) + status2);
    }

    function code200(res, data, ext, cors) {
        res.setHeader('Content-type', mimetypes.get(ext) || 'text/plain');
        if (cors) setCORS(res);
        res.statusCode = 200;
        res.end(data);
        console.log(status1 + c.gbi(c.k('200')) + status2);
    }
}

function getIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let addresses = [];
  for (let k in interfaces) {
      for (let k2 in interfaces[k]) {
          const address = interfaces[k][k2];
          if (address.family === 'IPv4' && !address.internal) {
              addresses.push(address.address);
          }
      }
  }

  return addresses[0];
}

// maps file extention to MIME typers
const mimetypes = new Map([
    ['.ico','image/x-icon'],
    ['.html','text/html'],
    ['.js','text/javascript'],
    ['.json','application/json'],
    ['.css','text/css'],
    ['.png','image/png'],
    ['.jpg','image/jpeg'],
    ['.wav','audio/wav'],
    ['.mp3','audio/mpeg'],
    ['.svg','image/svg+xml'],
    ['.pdf','application/pdf'],
    ['.doc','application/msword'],
]);

// console colors
const c = {
    r: t => '\x1b[31m'+t+'\x1b[0m',
    g: t => '\x1b[32m'+t+'\x1b[0m',
    b: t => '\x1b[34m'+t+'\x1b[0m',
    c: t => '\x1b[36m'+t+'\x1b[0m',
    m: t => '\x1b[35m'+t+'\x1b[0m',
    y: t => '\x1b[33m'+t+'\x1b[0m',
    k: t => '\x1b[30m'+t+'\x1b[0m',
    w: t => '\x1b[37m'+t+'\x1b[0m',
    x: t => '\x1b[39m'+t+'\x1b[0m',
    ri: t => '\x1b[91m'+t+'\x1b[0m',
    gi: t => '\x1b[92m'+t+'\x1b[0m',
    bi: t => '\x1b[94m'+t+'\x1b[0m',
    ci: t => '\x1b[96m'+t+'\x1b[0m',
    mi: t => '\x1b[95m'+t+'\x1b[0m',
    yi: t => '\x1b[93m'+t+'\x1b[0m',
    ki: t => '\x1b[90m'+t+'\x1b[0m',
    wi: t => '\x1b[97m'+t+'\x1b[0m',
    rb: t => '\x1b[41m'+t+'\x1b[0m',
    gb: t => '\x1b[42m'+t+'\x1b[0m',
    bb: t => '\x1b[44m'+t+'\x1b[0m',
    cb: t => '\x1b[46m'+t+'\x1b[0m',
    mb: t => '\x1b[45m'+t+'\x1b[0m',
    yb: t => '\x1b[43m'+t+'\x1b[0m',
    kb: t => '\x1b[40m'+t+'\x1b[0m',
    wb: t => '\x1b[47m'+t+'\x1b[0m',
    xb: t => '\x1b[49m'+t+'\x1b[0m',
    rbi: t => '\x1b[101m'+t+'\x1b[0m',
    gbi: t => '\x1b[102m'+t+'\x1b[0m',
    bbi: t => '\x1b[104m'+t+'\x1b[0m',
    cbi: t => '\x1b[106m'+t+'\x1b[0m',
    mbi: t => '\x1b[105m'+t+'\x1b[0m',
    ybi: t => '\x1b[103m'+t+'\x1b[0m',
    kbi: t => '\x1b[100m'+t+'\x1b[0m',
    wbi: t => '\x1b[107m'+t+'\x1b[0m',
    reset: t => '\x1b[0m'+t,
    bright: t => '\x1b[1m'+t+'\x1b[0m',
    dim: t => '\x1b[2m'+t+'\x1b[0m',
    underscore: t => '\x1b[4m'+t+'\x1b[0m',
    blink: t => '\x1b[5m'+t+'\x1b[0m',
    inverse: t => '\x1b[7m'+t+'\x1b[0m',
    hidden: t => '\x1b[8m'+t+'\x1b[0m',
};