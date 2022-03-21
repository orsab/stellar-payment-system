const { getUserByEmail } = require("../../lib/db");
const stellar = require("../../lib/stellar");
const sdk = stellar.getInstance();

const createPayment = async (event, context) => {
    const { principalId } = event.requestContext.authorizer;
    const { id } = event.pathParameters;
  
    const dbUser = await getUserByEmail(principalId);
    if (!dbUser) {
      return {
        statusCode: 401,
      };
    }
  
    try {
      const custodian = dbUser.accounts.find((a) => a.id === id);

      const {amount, assetCode} = JSON.parse(event.body);
      if (!custodian) {
        throw new Error("Account not found");
      }
      if (!amount) {
        throw new Error("amount is mandatory");
      }
      else{
        if(Number(amount) <= 0){
          throw new Error("amount must to be positive");
        }
      }
      if (!assetCode) {
        throw new Error("assetCode is mandatory");
      }

      const asset = sdk.assets.find(a => a.code === assetCode)
      if (!asset) {
        throw new Error(
          `Wrong asset provided, should to be: ${sdk.assets.reduce((acc, item) => {
            acc += `${item.code},`;
            return acc;
          }, "")}`
        );
      }

      const [acc] = await sdk.getAccounts([dbUser.wallet.public])
      if(!acc.balances.some(b => b.asset_issuer === asset.issuer && b.asset_code === asset.code)){
        // Create trustline if not exist

        try{
          await sdk.establishTrustline(
            dbUser.wallet.public,
            dbUser.wallet.secret,
            asset
          )
        }catch(e){
          throw new Error('Low reserve')
        }
      }

      const resp = await sdk.createSponsoredPayment(custodian.public, custodian.secret, dbUser.wallet.public, dbUser.wallet.secret, dbUser.wallet.public, amount, asset)
      console.log(resp)

      return {
        statusCode: 200,
        body: JSON.stringify({status: 'ok'}),
      };
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: String(e) }),
      };
    }
  };

  module.exports = createPayment