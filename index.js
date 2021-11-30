const newsProviders = require('./newsProviders.json')
const readline = require("readline")
const Nightmare = require('nightmare')
const cheerio = require('cheerio')
const open = require('open')
const http = require("http")

const nightmare = Nightmare({
    pollInterval: 200 //in ms
})

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const print = message => {
    console.log(message)
}

const removeSpaces = text => text.replace(/\s+/g, ' ').trim()

const getData = (selectors, raw) => {
    const $ = cheerio.load(raw)

    const title = removeSpaces($(selectors.title).text())

    let body = $(selectors.body)
    selectors.removeFromBody.forEach(item => body.find(item).empty())

    const date = removeSpaces($(selectors.date).text())

    const port = 3000

    http.createServer(function (req, res) {
        res.write('<html><head>');
        res.write('<meta http-equiv="content-type" content="text/html; charset=utf-8" />');
        res.write('<style> table, th, td {border: 1px solid black;border-collapse: collapse;}</style>');
        res.write('</head><body>');
        res.write('<table>');
        res.write('<tr>');
        res.write('<th>Título</th>');
        res.write('<th>Data</th>');
        res.write('<th>Corpo</th>');
        res.write('</tr>');
        res.write('<tr>');
        res.write('<th>' + title + '</th>');
        res.write('<th>' + date + '</th>');
        res.write('<th>' + body.text() + '</th>');
        res.write('</tr>');
        res.write('</table>');
        res.end('</body></html>');
        process.exit(0)
    })
        .listen(port);

    open('http://localhost:'+ port)
}

rl.question("Url: ", async url => {
    const newsProvider = newsProviders.find(item => url.includes(item.domain))
    if (newsProvider === undefined) {
        print('Jornal não identificado.')
        process.exit(1)
    }

    print('\n' + newsProvider.name)
    print('Carregando...')

    const selectors = newsProvider.selectors

    nightmare
        .viewport(1280, 800)
        .goto(url)
        .wait('body')
        .evaluate(() => document.querySelector('body').innerHTML)
        .end()
        .then(raw => {
            print('Processando...')
            getData(selectors, raw)
        })
        .catch(error => {
            console.error('Ocorreu um erro: ', error)
            process.exit(1)
        })
});

