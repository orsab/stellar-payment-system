const sdk = require("stellar-sdk");
const fetch = require("node-fetch");

class StellarHandler {
  static instance
  server;
  networkPassphrase;

  mainAsset = new sdk.Asset(
    "USDC",
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  );

  assets = [
    new sdk.Asset(
      "BTC",
      "GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF"
    ),
    new sdk.Asset(
      "ETH",
      "GBFXOHVAS43OIWNIO7XLRJAHT3BICFEIKOJLZVXNT572MISM4CMGSOCC"
    ),
    new sdk.Asset(
      "LTC",
      "GC5LOR3BK6KIOK7GKAUD5EGHQCMFOGHJTC7I3ELB66PTDFXORC2VM5LP"
    ),
    new sdk.Asset(
      "BAT",
      "GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR"
    ),
    new sdk.Asset(
      "LINK",
      "GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR"
    ),
    new sdk.Asset(
      "USDT",
      "GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V"
    ),
  ];

  constructor({ availableAssets, network = "testnet" }) {
    if (availableAssets) {
      this.assets = availableAssets;
    }

    if(network === 'testnet'){
      this.assets = [
        new sdk.Asset('SRT','GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B'),
        new sdk.Asset('MULT','GDLD3SOLYJTBEAK5IU4LDS44UMBND262IXPJB3LDHXOZ3S2QQRD5FSMM')
      ]
    }

    this.server = new sdk.Server(
      network === "testnet"
        ? "https://horizon-testnet.stellar.org"
        : "https://horizon.stellar.org"
    );
    this.networkPassphrase =
      network === "testnet" ? sdk.Networks.TESTNET : sdk.Networks.PUBLIC;
  }

  static getInstance = (params) => {
    if(!StellarHandler.instance){
      StellarHandler.instance = new StellarHandler(params || {network:process.env.NETWORK})
    }
    return StellarHandler.instance
  }

  buildTransaction = async (account, accountSecret, operation, xdrOnly=false) => {
    let transaction = new sdk.TransactionBuilder(account, {
      fee: sdk.BASE_FEE,
    })

    if(Array.isArray(operation)){
      for(const op of operation){
        transaction = transaction.addOperation(op)
      }
    }
    else{
      transaction = transaction.addOperation(operation)
    }

    transaction = transaction
      .setNetworkPassphrase(this.networkPassphrase)
      .setTimeout(180)
      .build();

    if (Array.isArray(accountSecret)) {
      for (const secret of accountSecret) {
        transaction.sign(sdk.Keypair.fromSecret(secret));
      }
    } else {
      transaction.sign(sdk.Keypair.fromSecret(accountSecret));
    }

    if(xdrOnly){
      return transaction.toXDR()
    }
    await this.server.submitTransaction(transaction)
  };

  getAccounts = async (addresses) => {
    const accounts = await Promise.all(
      addresses.filter((a) => !!a).map((a) => this.server.loadAccount(a))
    );

    return accounts;
  };

  establishSponsoredTrustline = async (
    account,
    accountSecret,
    sponsor,
    sponsorSecret,
    asset
  ) => {
    const [acc] = await this.getAccounts([sponsor]);

    return this.buildTransaction(
      acc,
      [sponsorSecret, accountSecret],
      [
        sdk.Operation.beginSponsoringFutureReserves({
          sponsoredId: account,
        }),
        sdk.Operation.changeTrust({
          asset,
          source: account,
        }),
        sdk.Operation.endSponsoringFutureReserves({
          source: account
        }),
      ]
    );
  };

  establishTrustline = async (
    account,
    accountSecret,
    asset
  ) => {
    const [acc] = await this.getAccounts([account]);

    return this.buildTransaction(
      acc,
      accountSecret,
      sdk.Operation.changeTrust({
        asset,
      })
    );
  };

  createSponsoredAccount = async (
    sponsor,
    sponsorSecret,
    custodian,
    startingBalance = "1.0"
  ) => {
    const [sponsorAccount] = await this.getAccounts([sponsor]);

    return this.buildTransaction(
      sponsorAccount,
      sponsorSecret,
      sdk.Operation.createAccount({
        destination: custodian,
        startingBalance,
      })
    );
  };

  sponsorPayment = async (
    sponsor,
    sponsorSecret,
    account,
    accountSecret,
    destination,
    amount,
    asset
  ) => {
    const [acc] = await this.getAccounts([account]);

    const transaction = new sdk.TransactionBuilder(acc, {
      fee: sdk.BASE_FEE,
    })
      .addOperation(
        sdk.Operation.payment({
          amount,
          asset,
          destination,
          source: sponsor,
        })
      )
      .setNetworkPassphrase(networkPassphrase)
      .setTimeout(0)
      .build();

    transaction.sign(sdk.Keypair.fromSecret(accountSecret));
    transaction.sign(sdk.Keypair.fromSecret(sponsorSecret));

    await this.server.submitTransaction(transaction);
  };

  mergeAccount = async (account, accountSecret, destination) => {
    return this.buildTransaction(
      account,
      accountSecret,
      sdk.Operation.accountMerge({
        destination,
      })
    );
  };

  createSponsoredPayment = async (account, accountSecret, sponsor, sponsorSecret, destination, amount, asset) => {
    const [acc] = await this.getAccounts([account]);

    const balance = acc.balances.find(b => b.asset_code === asset.code && b.asset_issuer === asset.issuer)
    if(!balance){
      throw new Error('Must create trustline')
    }
    if(Number(balance.balance) < Number(amount)){
      throw new Error('Low balance')
    }

    const xdr = await this.buildTransaction(
      acc,
      accountSecret,
      sdk.Operation.payment({
        destination,
        amount,
        asset,
      }),
      true
    );

    const bumpedTx = sdk.TransactionBuilder.buildFeeBumpTransaction(sdk.Keypair.fromSecret(sponsorSecret), sdk.BASE_FEE, sdk.TransactionBuilder.fromXDR(xdr, this.networkPassphrase), this.networkPassphrase)
    bumpedTx.sign(sdk.Keypair.fromSecret(sponsorSecret))

    return await this.server.submitTransaction(bumpedTx)
  };

  getDepositAddress = async (
    source,
    sourceSecret,
    custodian,
    custodianSecret,
    amount,
    assetCode
  ) => {
    const [acc] = await this.getAccounts([custodian]);

    const asset = this.assets.find(a => a.code === assetCode)

    if (
      !acc.balances.some(
        (b) => b.asset_issuer === asset.issuer && b.asset_code === asset.code
      )
    ) {
      // If trustline not exist - create the trustline
      await this.establishSponsoredTrustline(
        custodian,
        custodianSecret,
        source,
        sourceSecret,
        asset
      )
    }

    // SEP-10 sign challenge
    return await this.server
      .loadAccount(this.assets.find((a) => a.code === asset.code).issuer)
      .then(async (acc) => {
        const { home_domain } = acc;

        const toml = await sdk.StellarTomlResolver.resolve(home_domain);
        let transfer_server, web_auth_server;
        if (!toml.TRANSFER_SERVER) {
          throw new Error("Bad toml file");
        } else {
          transfer_server = toml.TRANSFER_SERVER;
          web_auth_server = toml.WEB_AUTH_ENDPOINT;
        }

        console.log({ transfer_server });
        // Check minimum/maximum
        const info = await fetch(`${transfer_server}/info`).then(resp => resp.json())
        const assetLimits = info.deposit[assetCode]
        if(assetLimits.enabled){
          if(assetLimits.min_amount && assetLimits.min_amount > Number(amount)){
            throw new Error(`Minimum is ${assetLimits.min_amount}`)
          }
          if(assetLimits.max_amount && assetLimits.max_amount < Number(amount)){
            throw new Error(`Maximum is ${assetLimits.max_amount}`)
          }
        }
        else{
          throw new Error('This asset not enabled')
        }


        let depositInfo,
          token,
          authHeaders = {};

        if (web_auth_server) {
          // Auth required
          const challenge = await fetch(
            `${web_auth_server}?account=${custodian}`
          ).then((res) => res.json());

          const challengeTrx = challenge.transaction ? challenge.transaction : challenge.xdr
          const signedTransaction = sdk.TransactionBuilder.fromXDR(challengeTrx, this.networkPassphrase)
          signedTransaction.sign(sdk.Keypair.fromSecret(custodianSecret))

          const tokenResponse = await fetch(`${web_auth_server}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ transaction: signedTransaction.toXDR() }),
          }).then((res) => res.json());

          token = tokenResponse.token;
          authHeaders.Authorization = `Bearer ${token}`;
        }

        depositInfo = await fetch(
          `${transfer_server}/deposit?asset_code=${asset.code}&account=${custodian}&amount=${amount}`,
          { headers: { ...authHeaders } }
        )
          .then((resp) => resp.json())
          console.log(depositInfo)

        return depositInfo;
      });
  };
}

module.exports = StellarHandler;
