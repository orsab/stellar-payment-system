const { getUserByEmail } = require("../../lib/db");
const stellar = require("../../lib/stellar");
const {
  getDepositAddress,
  assets,
} = stellar.getInstance();

const getDepositAddressForAsset = async (event, context) => {
    const { principalId } = event.requestContext.authorizer;
    const { id } = event.pathParameters;
  
    const dbUser = await getUserByEmail(principalId);
    if (!dbUser) {
      return {
        statusCode: 401,
      };
    }
  
    const custodian = dbUser.accounts.find((a) => a.id === id);
    const data = JSON.parse(event.body);
    const { amount, assetCode } = data;
  
    try {
      if (!custodian) {
        throw new Error("Custodian account not found");
      }
      if (!amount || Number(amount) <= 0) {
        throw new Error("Amount should to be positive");
      }
  
      if (!assets.some((a) => a.code === assetCode)) {
        throw new Error(
          `Wrong asset provided, should to be: ${assets.reduce((acc, item) => {
            acc += `${item.code},`;
            return acc;
          }, "")}`
        );
      }
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: String(e) }),
      };
    }
  
    const resp = await getDepositAddress(
      dbUser.wallet.public,
      dbUser.wallet.secret,
      custodian.public,
      custodian.secret,
      amount,
      assetCode
    ).catch((e) => ({ error: String(e) }));
  
    return {
      statusCode: resp.error ? 400 : 200,
      body: JSON.stringify(resp),
    };
  };

  module.exports = getDepositAddressForAsset