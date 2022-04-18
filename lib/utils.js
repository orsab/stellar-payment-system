const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const { getUserByEmail } = require("../lib/db");

async function signToken(user) {
  const secret = Buffer.from(process.env.JWT_SECRET, "base64");

  return jwt.sign({ email: user.email, id: user.id, roles: ["USER"] }, secret, {
    expiresIn: 86400 // expires in 24 hours
  });
}

async function getUserFromToken(token) {
  const secret = Buffer.from(process.env.JWT_SECRET, "base64");

  const decoded = jwt.verify(token.replace("Bearer ", ""), secret);

  return decoded;
}

async function login(args) {
  try {
    const user = await getUserByEmail(args.email);

    const isValidPassword = await comparePassword(
      args.password,
      user.passwordHash
    );

    if (isValidPassword) {
      const token = await signToken(user);
      return Promise.resolve({ auth: true, token: token, status: "SUCCESS" });
    }
  } catch (err) {
    console.info("Error login", err);
    return Promise.reject(new Error(err));
  }
}

function comparePassword(eventPassword, userPassword) {
  return bcrypt.compare(eventPassword, userPassword);
}

function cleanSecretsFromUser(dbUser){
  delete dbUser.wallet.secret
  for(const account of dbUser.accounts){
    delete account.secret
  }
}

async function getPriceForCurrencies (currencies){
  const map = {
      BTC:'bitcoin',
      ETH:'ethereum',
      XLM:'stellar',
      AQUA:'aquarius',
      USDT:'tether'
  }
  const coins = []
  for(const coin of currencies){
      if(map[coin]){
          coins.push(map[coin])
      }
  }
  const resp = await axios(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coins.join(',')}&order=market_cap_desc&per_page=100&page=1&sparkline=false`)
  return resp.data.reduce((acc, item)=>{
      acc[item.symbol.toUpperCase()] = item.current_price
      return acc
  }, {})
}

module.exports = {
  signToken,
  getUserFromToken,
  login,
  cleanSecretsFromUser,
  getPriceForCurrencies
};