const { getUserByEmail } = require("../lib/db");
const { getAccounts } = require("../lib/stellar").getInstance();
const { getUserFromToken, cleanSecretsFromUser } = require("../lib/utils");

module.exports.handler = async function (event) {
  const { principalId } = event.requestContext.authorizer;

  const dbUser = await getUserByEmail(principalId);
  cleanSecretsFromUser(dbUser)
  
  const [mainAccount] = await getAccounts([dbUser.wallet.public])
  dbUser.wallet.balances = mainAccount.balances

  return {
    statusCode: 200,
    headers: {},
    body: JSON.stringify(dbUser),
  };
};
