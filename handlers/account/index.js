const createAccount = require('./createAccount')
const getDepositAddressForAsset = require('./getDepositAddressForAsset')
const getBalance = require('./getBalance')
const deleteAccount = require('./deleteAccount')
const createPayment = require('./createPayment')

module.exports = {
    createAccount,
    getDepositAddressForAsset,
    getBalance,
    deleteAccount,
    createPayment
}