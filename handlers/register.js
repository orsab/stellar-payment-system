
   
const { createDbUser } = require("../lib/db");

module.exports.handler = async (event, ctx, callback) => {
  const body = JSON.parse(event.body);

  if(!body.wallet){
    return {
        statusCode: 400,
        body: { message: 'Must provide main wallet' }
      };
  }

  return createDbUser(body)
    .then(user => ({
      statusCode: 200,
      body: JSON.stringify(user)
    }))
    .catch(err => {
      console.log({ err });

      return {
        statusCode: err.statusCode || 500,
        body: { message: err.message }
      };
    });
};