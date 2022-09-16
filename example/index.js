const rccLoader = require('../src/loader')
const path = require('path')
const fs = require('fs')

const resource = path.resolve(__dirname, './style.scss')
console.log('resource', resource)

const content = fs.readFileSync(resource, 'utf-8')

rccLoader.bind({
  resource,
  rootContext: __dirname,
  getLogger: () => console.log,
  getOptions: () => ({
    enabled: true,
    fs,
    exports: () => ({ rcc: true, style: false })
  })
})(content)