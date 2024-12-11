const bcrypt = require("bcrypt");

const generatePassword = (password) => {
  const salt = bcrypt.genSaltSync(10);
  const hasehedPassword = bcrypt.hashSync(password, salt);

  return hasehedPassword;
};

const comparePassword = (password, hash) => {
  //password user --->
  //hash db --->
  const result = bcrypt.compareSync(password, hash);

  return result;
};

module.exports = {
  generatePassword,
  comparePassword,
};
