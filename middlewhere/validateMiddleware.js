// Validate Sign Up request body
export const validateSignUp = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res
      .status(400)
      .json({ message: "Request body is missing or empty." });
  }

  const { fullName, email, password, confirmPassword } = req.body;

  if (!fullName || !email || !password || !confirmPassword) {
    return res
      .status(400)
      .json({ message: "Please fill in all required fields." });
  }

  // Simple email regex
  if (fullName.length < 3) {
    return res
      .status(400)
      .json({ message: "Fullname must be at least 2 characters long." });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  next();
};

// Validate Login request body
export const validateLogin = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res
      .status(400)
      .json({ message: "Request body is missing or empty." });
  }
  if (req.body.loginType === "google" && req.body.idToken) {
    return next();
  }
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide both email and password." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  next();
};
