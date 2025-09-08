import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import flash from "connect-flash";
import requestIp from "request-ip";
import path from "path";
import { fileURLToPath } from "url";
import urlRoutes from "./routes/url.route.js";
import authRoute from "./routes/auth.route.js";
import { verifyAuthentication } from "./middleware/verify.auth.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Middleware

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "my-secret",
    resave: true,
    saveUninitialized: false,
  })
);
app.use(requestIp.mw());
app.use(flash());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(verifyAuthentication);
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// Use Routes
app.use("/", urlRoutes);
app.use("/auth", authRoute);

// Start server
app.listen(port, () =>
  console.log(`🚀 Server running at http://localhost:${port}`)
);
