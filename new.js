
const fs = require('fs');
let settings = JSON.parse(fs.readFileSync('./settings.json'));

const comics = fs.readdirSync(settings.comics);

const data = `extends ../templates/comic

block variables
    - title = 'The Title'
    - description = 'meta description'

block comic
    img(src='' alt='')
    
block blogTitle
    | ${new Date().toDateString()}

block blog
    p.
        blog text lorem ipsum
`;

const filePath = settings.comics + (comics.length + 1) + '.pug';

fs.writeFile(filePath, data, err => {
    if (err) console.error(err);
    else {
        console.log(`${filePath} created!`);
        require('readline').createInterface(process.stdin, process.stdout).question("Press [Enter] to exit...", process.exit);
    }
});