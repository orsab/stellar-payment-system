const { addAccount, getUserByEmail } = require("../../lib/db");
const sdk = require("stellar-sdk");
const stellar = require("../../lib/stellar");
const { cleanSecretsFromUser } = require("../../lib/utils");
const {
  createSponsoredAccount,
} = stellar.getInstance();

const createAccount = async (event, context) => {
    const { principalId } = event.requestContext.authorizer;
  
    const dbUser = await getUserByEmail(principalId);
    if (!dbUser) {
      return {
        statusCode: 401,
      };
    }
  
    try {
      const data = JSON.parse(event.body);
      if (!data.id) {
        throw new Error("id is mandatory");
      }
  
      const keypair = sdk.Keypair.random();
  
      const newAccount = {
        id: data.id,
        secret: keypair.secret(),
        public: keypair.publicKey(),
      };
  
      const alreadyExist = dbUser.accounts.find((a) => a.id === data.id);
      if (alreadyExist) {
        throw new Error(`Account id ${data.id} already exists`);
      }
  
      await createSponsoredAccount(
        dbUser.wallet.public,
        dbUser.wallet.secret,
        newAccount.public
      );
      const resp = await addAccount(dbUser.id, newAccount);
      cleanSecretsFromUser(resp);
  
      return {
        statusCode: 200,
        body: JSON.stringify(resp),
      };
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: String(e) }),
      };
    }
  };

  module.exports = createAccount