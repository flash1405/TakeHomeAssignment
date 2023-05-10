const express = require("express");
const app = express();
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const pdfConfig = require("./pdfConfig");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const jwtConfig = require("./jwtConfig");

const initializePassport = require("./passportConfig");
initializePassport(passport);

const PORT = process.env.PORT || 4000;

// Middleware
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false })); // to get data from form in req.body
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(express.json());
app.use(cookieParser());

// Routes
// GET
app.get("/", (req, res) => {
  res.render("index");
});

app.get(
  "/users/register",
  jwtConfig.validateToken,
  checkAuthenticated,
  (req, res) => {
    res.render("register");
  }
);

app.get(
  "/users/login",
  jwtConfig.validateToken,
  checkAuthenticated,
  (req, res) => {
    res.render("login");
  }
);

app.get(
  "/users/dashboard",
  jwtConfig.validateToken,
  checkNotAuthenticatedToken,
  (req, res) => {
    pdfConfig.createPDF(req.user.id, req.user.name, req.user.email);
    res.render("dashboard", { user: req.user.name });
  }
);

app.get("/users/logout", function (req, res, next) {
  res.clearCookie("access-token");
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success_msg", "You have logged out");
    res.redirect("/users/login");
  });
});

app.get(
  "/users/pdf",
  jwtConfig.validateToken,
  checkNotAuthenticatedToken,
  async (req, res) => {
    const filePath = `./pdf/${req.user.id}.pdf`;
    const fileContent = await fs.promises.readFile(filePath);
    res.contentType("application/pdf");
    res.send(fileContent);
  }
);

app.get("/users/createCookie", checkNotAuthenticated, (req, res) => {
  const accessToken = jwtConfig.createTokens(req.user);
  res.cookie("access-token", accessToken, {
    maxAge: 60 * 60 * 1000,
    httpOnly: true,
  });
  res.redirect("/users/dashboard");
});

// POST
app.post("/users/register", async (req, res) => {
  let { name, email, password, password_confirm } = req.body;
  let errors = [];
  if (!name || !email || !password || !password_confirm) {
    errors.push({ message: "Please enter all fields" });
  }
  if (password.length < 6) {
    errors.push({ message: "Password should be atleast 6 characters" });
  }
  if (password != password_confirm) {
    errors.push({ message: "Passwords do not match" });
  }
  if (errors.length > 0) {
    res.render("register", { errors });
  } else {
    let hashedPassword = await bcrypt.hash(password, 10);
    pool.query(
      `SELECT * FROM users 
      WHERE email = $1 `,
      [email],
      (err, results) => {
        if (err) {
          throw err;
        } else {
          if (results.rows.length > 0) {
            errors.push({ message: "Email already registered" });
            res.render("register", { errors });
          } else {
            pool.query(
              `INSERT INTO users (name, email, password)
              VALUES ($1, $2, $3)
              RETURNING id, password`,
              [name, email, hashedPassword],
              (err, results) => {
                if (err) {
                  throw err;
                }
                req.flash(
                  "success_msg",
                  "You are now registered. Please log in"
                );
                res.redirect("/users/login");
              }
            );
          }
        }
      }
    );
  }
});

app.post(
  "/users/login",
  passport.authenticate("local", {
    successRedirect: "/users/createCookie",
    failureRedirect: "/users/login",
    failureFlash: true,
  })
);

function checkAuthenticated(req, res, next) {
  if (req.authenticated) {
    return res.redirect("/users/dashboard");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/users/login");
}

function checkNotAuthenticatedToken(req, res, next) {
  if (req.authenticated) {
    return next();
  }
  req.flash("error", "You are not authorized to view this resource");
  res.redirect("/users/login");
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
