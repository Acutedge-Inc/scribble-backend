const express = require("express");
const { performLogin, register, health ,getAccessToken,changePassword,sendRecoverPasswordEmail,recoverPassword,createTenant} = require("../controllers/auth.js");
const { checkMissingInputs, validateInputs } = require("../middlewares");
const { auth } = require("../lib");
const jwt = require('jsonwebtoken');
const authRoutes = express.Router();



authRoutes.post("/login", checkMissingInputs, validateInputs, performLogin);


authRoutes.post("/tenant", checkMissingInputs, validateInputs, createTenant);


  
  // Register a user under a tenant's database
  authRoutes.post("/register/user", async (req, res) => {
    try {
      const { username, password } = req.body;
      const { "x-tenant-id": tenantId } = req.headers;
  
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID is required in headers" });
      }
  
      const connection = await getConnection(tenantId);
  
      const UserSchema = new mongoose.Schema({
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
      });
  
      const User = connection.model("User", UserSchema);
  
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const newUser = new User({ username, password: hashedPassword });
      await newUser.save();
  
      res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });



// Registration route
// authRoutes.post("/register", checkMissingInputs, validateInputs, register);
authRoutes.get("/health", health);


// Get new accesstoken,based on valid refresh token
authRoutes.post("/refresh", checkMissingInputs, validateInputs, getAccessToken);

authRoutes.put(
    "/change-password",
    auth.protect(["sso.self.write"]),
    checkMissingInputs,
    validateInputs,
    changePassword
);

// Send Email with link to recover password [AG-839]
authRoutes.post(
    "/recover-password-email",
    checkMissingInputs,
    validateInputs,
    sendRecoverPasswordEmail
);

// Reset the new password (Triggered from the link mailed on above route) [AG-839]
authRoutes.post(
    "/recover-password",
    auth.protect(["sso.self.write"]),
    checkMissingInputs,
    validateInputs,
    recoverPassword
);
module.exports = authRoutes;
