const rccLoader = require('../dist/loader')

rccLoader.compile('./style.scss', __dirname, { exports: { rcc: true } })
