const sdk = require('stellar-sdk')

const run = async () => {

    const toml = await sdk.StellarTomlResolver.resolve('apay.io') 
    console.log(toml)
}

run()