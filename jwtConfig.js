const jwt = require("jsonwebtoken");

const createTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.ACCESS_TOKEN_SECRET
  );
  return accessToken;
};

const validateToken = (req, res, next) => {
  const accessToken = req.cookies["access-token"];
  if (!accessToken) {
    return next();
    //return res.status(400).json({ error: "User not authenticated" });
  }

  try {
    const validToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    req.user = validToken;
    if (validToken) {
      req.authenticated = true;
      return next();
    }
  } catch (err) {
    // return res.status(400).json({ error: err });
    return (req.authenticated = false);
  }
};

module.exports = { createTokens: createTokens, validateToken: validateToken };
