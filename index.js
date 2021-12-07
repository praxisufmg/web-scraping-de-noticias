const newsProviders = require('./newsProviders.json')
const Nightmare = require('nightmare')
require('nightmare-load-filter')(Nightmare)
const cheerio = require('cheerio')
const csv = require('csv-parser')
const fs = require('fs')
const Xlsx = require('xlsx')

const print = message => console.log(message)

const output = []

const saveOutput = () => {
    const sheet = Xlsx.utils.json_to_sheet(output);
    const book = Xlsx.utils.book_new();
    Xlsx.utils.book_append_sheet(book, sheet, "WorksheetName")
    Xlsx.writeFile(book, 'output.xlsx')
}

const removeSpaces = text => text.replace(/\s+/g, ' ').trim()

const getData = (selectors, raw, url) => {
    const $ = cheerio.load(raw)

    const title = selectors.title ? removeSpaces($(selectors.title).text()) : ''

    const lead = selectors.lead ? removeSpaces($(selectors.lead).text()) : ''

    let body = $(selectors.body)
    selectors.removeFromBody.forEach(item => body.find(item).empty())

    const date = removeSpaces($(selectors.date).text())

    output.push({
        Link: url,
        Titulo: title,
        Chamada: lead,
        Corpo: body.text(),
        Data: date,
    })
}

const nightmare = Nightmare({
    // pollInterval: 200,
    // show: true,
    // openDevTools: { detach: true },
    webPreferences: {
        images: false
    }
})

const loadWebsite = index => {
    const line = lines[index]
    const newsProvider = newsProviders.find(item => line.Url.includes(item.domain))
    if (newsProvider === undefined) {
        print('Jornal não identificado.')
        process.exit(1)
    }

    print('\n' + newsProvider.name)
    print('Carregando... ' + (index + 1) + ' de ' + quantity)

    const selectors = newsProvider.selectors

    return nightmare
        .filter({
            urls:[
                'https://cdn.onesignal.com',
                'http://opensharecount.com/count.json?url=http://hoje.vc/3czmy',
                'e.trvdp.com',
                'p.trvdp.com',
                'wfpscripts.webspectator.com',
                'graph.facebook.com',
                'cm.g.doubleclick.net',
                'secure-assets.rubiconproject.com',
                'imasdk.googleapis.com',
                'publyads.jstag.space',
                'www.google-analytics.com',

            ]}, function(details, cb){
                return cb({cancel: null});
        })
        .viewport(480, 320)
        .goto(line.Url)
        .wait('body')
        .evaluate(() => document.querySelector('body').innerHTML)
        .then(raw => {
            print('Processando...')
            getData(selectors, raw, line.Url)
            print('✓')
            return true
        })
        .catch(error => {
            console.error('Ocorreu um erro: ', error)
            process.exit(1)
        })
}

const lines = [];
let quantity = 0;
const startTime = Date.now()

const iterate = index => {
    if(index < quantity) {
        loadWebsite(index).then(() => iterate(index + 1))
    }
    else {
        const now = Date.now()
        let seconds = ((now - startTime) / 1000).toFixed(0)
        const minutes = (seconds / 60).toFixed(0)
        seconds = seconds % 60
        print('\nFim! ' + quantity + ' notícias em ' + minutes + ' minutos e ' + seconds + ' segundos')
        saveOutput()
    }
}

fs.createReadStream('input.csv')
    .pipe(csv())
    .on('data', (data) => lines.push(data))
    .on('end', () => {
        quantity = lines.length
        iterate(0)
    });