const { getUserByEmail } = require("../../lib/db");
const stellar = require("../../lib/stellar");
const { getPriceForCurrencies } = require("../../lib/utils");
const {
  getAccounts,
} = stellar.getInstance();

const getBalance = async (event, context) => {
    const { principalId } = event.requestContext.authorizer;
    const { id } = event.pathParameters;
  
    const dbUser = await getUserByEmail(principalId);
    if (!dbUser) {
      return {
        statusCode: 401,
      };
    }
  
    const wallet = dbUser.accounts.find((a) => a.id === id);
    if (!wallet) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Bad account supplied" }),
      };
    }
  
    const [acc] = await getAccounts([wallet.public]).catch((e) => {
      console.log(e);
      return [];
    });
  
    if (!acc) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Account is not inited" }),
      };
    }

    const currencies = acc.balances.map(c => c.asset_code ? c.asset_code : c.asset_type === 'native' ? 'XLM':null)
    const prices = await getPriceForCurrencies(currencies)

    acc.balances.forEach(c => {
      const currency = c.asset_code ? c.asset_code : c.asset_type === 'native' ? 'XLM':null
      const price = prices[currency]
      c.price = price
    })
  
    return {
      statusCode: 200,
      body: JSON.stringify(acc.balances),
    };
  };

  module.exports = getBalance