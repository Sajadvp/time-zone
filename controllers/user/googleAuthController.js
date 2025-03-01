const passport = require("passport");

module.exports.googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "select_account",
});

module.exports.googleAuthCallback = async (req, res) => {
  try {
    req.session.user = req.user;
    res.redirect("/");
  } catch (error) {
    console.error("Error during Google callback:", error);
    res.redirect("/login");
  }
};
