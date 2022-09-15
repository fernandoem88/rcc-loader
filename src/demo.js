const rccLoader = require('./loader')
const path = require('path')
const fs = require('fs')

const resource = path.resolve(__dirname, './demo.scss')
console.log('resource', resource)

const content = fs.readFileSync(resource, 'utf-8')

rccLoader.bind({
  resource,
  getLogger: () => console.log,
  getOptions: () => ({ enabled: true, fs })
})(content)
