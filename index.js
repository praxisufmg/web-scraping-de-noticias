const newsProviders = require('./newsProviders.json')
const Nightmare = require('nightmare')
require('nightmare-load-filter')(Nightmare);
const cheerio = require('cheerio')
const csv = require('csv-parser')
const fs = require('fs')
const ObjectsToCsv = require('objects-to-csv');

const nightmare = Nightmare({
    // pollInterval: 200,
    show: true,
    openDevTools: { detach: true },
    webPreferences: {
        images: false
    }
})

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
    output.push({
        Titulo: title,
        Data: date,
        Corpo: body.text()
    })
}

const loadWebsite = index => {
    const line = lines[index]
    const newsProvider = newsProviders.find(item => line.Url.includes(item.domain))
    if (newsProvider === undefined) {
        print('Jornal não identificado.')
        process.exit(1)
    }

    print('\n' + newsProvider.name)
    print('Carregando...')

    const selectors = newsProvider.selectors

    return nightmare
        .filter({
            urls:[
                'https://cdn.onesignal.com',

            ]}, function(details, cb){
                return cb({cancel: null});
        })
        .viewport(480, 320)
        .goto(line.Url)
        .wait('body')
        .evaluate(() => document.querySelector('body').innerHTML)

        // .end()
        .then(raw => {
            print('Processando...')
            getData(selectors, raw)
            return true
        })
        .catch(error => {
            console.error('Ocorreu um erro: ', error)
            process.exit(1)
        })
}

const output = []
const saveOutput = () => {
    const outputCsv = new ObjectsToCsv(output);

    outputCsv.toDisk('./output.csv', undefined)
        .then(() => process.exit(0))
        .catch(() => {
            print("Erro ao salvar arquivo")
            process.exit(1)
        });
}

const lines = [];
let quantity = 0;

const iterate = index => {
    if(index < quantity) {
        loadWebsite(index).then(() => iterate(index + 1))
    }
    else {
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


