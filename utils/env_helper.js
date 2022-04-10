const { getSecretValue } = require("../secrets");
const {
  INFURA_TOKEN,
  INTERNAL_TOKEN
} = require("./dev_config");

let env;
const environment = process.env.NODE_ENV;

async function getInfuraToken() {
  if (environment == "dev") {
    return INFURA_TOKEN;
  } else {
    const infuraSecret = await getSecretValue(`${environment}_infura`);
    return infuraSecret;
  }
}

async function getInternalToken() {
  if (environment == "dev") {
    return INTERNAL_TOKEN;
  } else {
    const internalTokenSecret = await getSecretValue(
      `${environment}_internal_token`
    );
    return internalTokenSecret["token"];
  }
}

async function getEnv() {
  if (env) {
    return env;
  }
  const infuraToken = await getInfuraToken();
  const internalToken = await getInternalToken();
  env = {
    internalToken: internalToken,
    infuraToken: infuraToken["INFURA_TOKEN"],
    infuraSecret: infuraToken["INFURA_SECRET"]
  };
  return env;
}

module.exports = {
  getEnv,
};
