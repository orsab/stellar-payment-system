// Require AWS SDK and instantiate DocumentClient
const AWS = require("aws-sdk");
const bcrypt = require("bcryptjs");
const { Table, Entity } = require("dynamodb-toolbox");
const { v4: uuidv4 } = require("uuid");

const docClient = new AWS.DynamoDB.DocumentClient();

const UserTable = new Table({
  // Specify table name
  name: process.env.TABLE_NAME,

  // Define partition and sort keys
  partitionKey: "pk",
  sortKey: "sk",

  DocumentClient: docClient,
});

const User = new Entity({
  name: "User",
  attributes: {
    id: { type: "string", partitionKey: true },
    sk: { sortKey: true, hidden: true },
    passwordHash: { type: "string" },
    wallet: { type: "map" },
    accounts: { type: "list" },
  },
  table: UserTable,
  autoParse: true,
});

// INIT AWS
AWS.config.update({
  region: process.env.AWS_REGION,
});

const createDbUser = async (props) => {
  const acc = await getUserByEmail(props.email);
  if (acc.id === props.email) {
    throw new Error("Account already exists");
  }

  const passwordHash = await bcrypt.hash(props.password, 8); // hash the pass
  delete props.password; // don't save it in clear text

  const params = {
    id: props.email,
    passwordHash,
    wallet: props.wallet,
    accounts: [],
    sk: props.email,
  };
  const response = await User.put(params);

  console.log("create user with params", params);

  return User.parse(response);
};

const getUserByEmail = async (email) => {
  const response = await User.scan({
    filters: { attr: "pk", eq: email }, // only return orders between $100 and $500
  });

  return response.Items.pop();
};
const addAccount = async (id, account) => {
  const acc = await getUserByEmail(id);
  if (acc.accounts.some((a) => a.id === account.id)) {
    throw new Error("Account already exists");
  }

  await User.update({
    sk: id,
    pk: id,
    accounts: { $append: [account] },
  });

  return getUserByEmail(id);
};
const delAccount = async (id, account) => {
  const acc = await getUserByEmail(id);
  if (!acc.accounts.some((a) => a.id === account.id)) {
    throw new Error("Account not exists");
  }

  await User.update({
    sk: id,
    pk: id,
    accounts: { $remove: [acc.accounts.indexOf(acc.accounts.find(a=>a.id===account.id))] },
  });

  return getUserByEmail(id);
};

module.exports = {
  createDbUser,
  getUserByEmail,
  addAccount,
  delAccount
};
