import express from "express";
import { PrismaClient, Role } from "@prisma/client";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import path from "path";

// using these have simple commands and functions to use
const prisma = new PrismaClient();
const app = express();
const adminPaths = ["/admin/"];
const restrictedPaths = ["/welcome", ...adminPaths];

// important for reading req.body and using static
app.use(cookieParser());

// middleware for checking if user has cookie and if they're admin
app.use(async (req, res, next) => {
  // Exclude '/register' and '/' routes
  const path = req.path;

  if (!restrictedPaths.includes(path)) return next(); // if path is not restricted, continue

  const token = req.cookies.token; // get token from cookie

  if (!token) return res.redirect("/"); // if no token, redirect to login

  // finds user with token
  const user = await prisma.users.findFirst({
    where: {
      token: token,
    },
  });
  
  if (!user) return res.redirect("/"); // if no user return to login

  // if they ask for admin path and they're not admin, redirect to welcome
  if (adminPaths.includes(path) && !Role.ADMIN) {
    return res.redirect("/welcome");
  }

  next(); // if everything works let them through
});

// using these after middleware so stuff works, these help to read req.body and use public folder
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

async function createUser() {
  const user = await prisma.users.create({
    data: {
      firstname: "test",
      lastname: "testing",
      mail: "test@test.com",
      password: crypto.createHash("sha256").update("Passord01").digest("hex"),
      role: Role.STUDENT,
    },
  });

  console.log(user.firstname + "" + "has been created");

  return user;
}

// function to create an admin
async function createAdmin() {
  const admin = await prisma.users.create({
    data: {
      firstname: "admin",
      lastname: "admin",
      mail: "admin@test.com",
      password: crypto.createHash("sha256").update("admin").digest("hex"),
      role: Role.ADMIN,
    },
  });

  console.log(`${admin.firstname} has been created`);

  return admin;
}

// post for login
app.post("/login", async (req, res) => {
  const { mail, password } = req.body;

  const userData = await prisma.users.findFirst({
    where: {
      mail: mail,
      password: crypto.createHash("sha256").update(password).digest("hex"),
    },
  });

  if (userData) {
    switch (userData.role === Role.ADMIN) {
      case true:
        res.cookie("token", userData.token);
        res.redirect("/admin");
        break;
      case false:
        res.cookie("token", userData.token);
        res.redirect("/welcome");
        break;
    }
  } else {
    res.redirect("/");
  }
});

// start the server
app.listen(3000, () => {
  console.log(`Server running on port 3000`);
});