const userModel = require("../models/UserModel");
const axios = require("axios"); // Correct import for axios
const auth = require("../auth/AuthValidation");
const { oauth2Client } = require("../utils/GoogleConfig");

const googleLogin = async (req, res) => {
  const { code } = req.query;
  try {
    const googleRes = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(googleRes.tokens);

    const userRes = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
    );
    const { email, name, picture } = userRes.data;
    // console.log(userRes);
    let user = await userModel.findOne({ Email: email });

    if (!user) {
      user = await userModel.create({
        Email: email,
        passwordChangedAt: Date.now(),
        FullName: "",
        DateOfBirth: "",
        MobileNumber: "",
      });
      auth.createSendToken(user, 201, res);
    } else {
      // If user exists, generate and send a token
      auth.createSendToken(user, 200, res);
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in Google Login",
      error: error.message,
    });
  }
};

module.exports = {
  googleLogin,
};
