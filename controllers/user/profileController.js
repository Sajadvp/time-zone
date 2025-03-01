const User = require("../../models/userSchema");
const { 
  generateOtp, 
  sendVerificationEmail, 
  hashPassword 
} = require("./userController"); 

module.exports = {
  getUserProfile: async (req, res) => {
    try {
      const userId = req.session.user?._id; 
      console.log(userId);
      if (!userId) {
        return res.status(400).send("User ID is required. Please log in.");
      }
  
      const user = await User.findById(userId); // Fetch user by session userId
      if (!user) {
        return res.status(404).send("User not found.");
      }
  
     
      res.render("user/profile", { user });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).send("Internal server error.");
    }
  },

  updateProfile: async (req, res) => {
    try {
        console.log('Session Data:', req.session);

        const userId= req.session.user?._id;

        if (!userId) {
          return res.redirect('/login');
        }

        const { name } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).send('Name is required and cannot be empty.');
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name: name.trim() },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).send('User not found.');
        }

        req.session.user.name = updatedUser.name;

        res.redirect('/userProfile');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Internal Server Error.');
    }
},

 // Controller methods
 forgotPasswordPage : async (req, res) => {
  res.render('user/forgot-password');
},

 forgotPasswordRequest :async (req, res) => {
  try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
          return res.status(404).json({ 
              success: false, 
              message: 'User not found' 
          });
      }

      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);

      if (emailSent) {
          req.session.forgotPassword = {
              email,
              otp,
              timestamp: Date.now()
          };
          return res.json({ 
              success: true, 
              message: 'OTP sent to your email' 
          });
      } else {
          return res.status(500).json({ 
              success: false, 
              message: 'Failed to send OTP' 
          });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ 
          success: false, 
          message: 'Server error' 
      });
  }
},

 forgetPassowordVerifyPage : async (req, res) => {
  res.render('user/verify-otp');
},

forgetPassowrdVerify : async (req, res) => {
  try {
      const { otp, newPassword } = req.body;
      const sessionData = req.session.forgotPassword;

      // Check if OTP session exists
      if (!sessionData) {
          return res.status(400).json({ 
              success: false, 
              message: 'OTP expired or invalid' 
          });
      }

      // Check OTP expiration (10 minutes)
      const now = Date.now();
      if ((now - sessionData.timestamp) > 600000) {
          delete req.session.forgotPassword;
          return res.status(400).json({ 
              success: false, 
              message: 'OTP expired' 
          });
      }

      // Verify OTP
      if (otp !== sessionData.otp) {
          return res.status(400).json({ 
              success: false, 
              message: 'Invalid OTP' 
          });
      }

      // Find user and update password
      const user = await User.findOne({ email: sessionData.email });
      if (!user) {
          return res.status(404).json({ 
              success: false, 
              message: 'User not found' 
          });
      }

      user.password = await hashPassword(newPassword);
      await user.save();

      // Clear session
      delete req.session.forgotPassword;

      res.json({ 
          success: true, 
          message: 'Password reset successful' 
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ 
          success: false, 
          message: 'Server error' 
      });
  }
}

    };