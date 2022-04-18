const { getUserByEmail, delAccount } = require("../../lib/db");
const stellar = require("../../lib/stellar");
const {
  getAccounts,
  mergeAccount,
} = stellar.getInstance();

const deleteAccount = async (event, context) => {
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
        body: JSON.stringify({ error: "Account not exist" }),
      };
    }
  
    const [acc] = await getAccounts([wallet.public]).catch((e) => {
      console.log(e);
      return [];
    });
  
    console.log({wallet})
    // Merge deleted custodian account into main
    if (acc) {
      await mergeAccount(acc, wallet.secret, dbUser.wallet.public, dbUser.wallet.secret, dbUser.wallet.public);
    }
    // Merge deleted custodian account into main
    const updatedAccount = await delAccount(principalId, wallet).catch(
      (e) => null
    );
  
    return {
      statusCode: 200,
      body: JSON.stringify(updatedAccount),
    };
  };

  module.exports = deleteAccount