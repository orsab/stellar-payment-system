# Stellar payment system
##Crypto payment system by stellar existing rails (SEP-10,SEP-6)
App is fully serverless. Uses custodian wallets to manage user funds.

### Architecture
- AWS lambda based on NodeJS 14.x
- DynamoDB
- Stellar SDK

### Setup
1. Set environment variables
```bash
JWT_SECRET= # generate unique hash
AWS_ID= # yours AWS account ID
NETWORK= # Stellar network = public|testnet
TABLE_NAME= # DynamoDB table name
```
2. Fund your Stellar manager account for XLM only (each account must to keep 1XLM, each method, like trustline, payment, merge account - sponsor custodian account by 100 stroops)

### Usage
1. Register new manager 
    ```$ curl -X POST -H 'Content-Type: application/json' -d '{"email":"$EMAIL","password":"$PASS","wallet":{"public":$PUBLIC,"secret":$SECRET}}' $ENDPOINT/register```
2. Login and receive JWT token
3. Create new account
4. Call to deposit function 
    ```$ curl -X POST -H 'Content-Type: application/json' -d '{"amount":"0.01","assetCode":"BTC"' $ENDPOINT/account/$ACC_ID/deposit```
5. Await until client's payment will be received
6. Call pay function (deposited funds are payed to manager account)
    ```$ curl -X POST -H 'Content-Type: application/json' -d '{"amount":"0.01","assetCode":"BTC"' $ENDPOINT/account/$ACC_ID/pay```