import express from "express";
import { PrismaClient, Role } from "@prisma/client";
import crypto from "crypto";
import cookieParser from "cookie-parser";

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

// function for creating a user
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
      password: crypto.createHash("sha256").update("Passord01").digest("hex"),
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

const pageRoutes = {
  welcome: (req, res) => {
    res.sendFile(__dirname + "/public/welcome.html");
  },
  adminEdit: (req, res) => {
    res.sendFile(__dirname + "/public/admin/edit.html");
  },
  adminCreate: (req, res) => {
    res.sendFile(__dirname + "/public/admin/create.html");
  },
  adminEditID: (req, res) => {
    res.sendFile(__dirname + "/public/admin/id.html");
  },
  adminManageID: (req, res) => {
    res.sendFile(__dirname + "/public/admin/manage/id.html")
  },
  adminManageAdd: (req, res) => {
    res.sendFile(__dirname + "/public/admin/manage/add.html")
  }
}

const apiRoutes = {
  getUsers: async (req, res) => {
    const users = await prisma.users.findMany();
    res.json(users);
  },
  getClasses: async (req, res) => {
    const classes = await prisma.class.findMany();
    res.json(classes);
  },
  getSpecificUser: async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await prisma.users.findFirst({
      where: {
        id: id,
      },
    });

    res.json(user);
  },
  createUser: async (req, res) => {
    const { firstname, lastname, mail, password, role } = req.body;

    const user = await prisma.users.create({
      data: {
        firstname: firstname,
        lastname: lastname,
        mail: mail,
        password: crypto.createHash("sha256").update(password).digest("hex"),
        role: role,
      },
    });

    res.redirect("/admin/");
  },
  createClass: async (req, res) => {
    const {grade} = req.body

    const createdClass = await prisma.class.create({
      data: {
        grade: grade
      }
    })

    res.redirect("/admin/manage")
  },
  getClassByID: async (req, res) => {
    const id = parseInt(req.params.id);
    const classData = await prisma.class.findFirst({
      where: {
        id: id
      }, include: {
        users: true, // Include the users relation
      },
    })

    res.json(classData);
  },
  removeFromClass: async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await prisma.users.update({
      where: {
        id: id,
      },
      data: {
        classID: null
      }
    });
    res.redirect("/admin/manage")
  },
  updateUser: async (req, res) => {
    const { token, firstname, lastname, mail, password, role, classID } = req.body;
  
    const hashedPassword = password ? crypto.createHash("sha256").update(password).digest("hex") : undefined;
    const ifClassID = classID ? parseInt(classID) : undefined;
  
    const updateUser = await prisma.users.update({
      where: {
        token: token,
      },
      data: {
        firstname: firstname,
        lastname: lastname,
        mail: mail,
        password: hashedPassword,
        role: role,
        classID: ifClassID
      }
    })
    
    res.redirect("/admin/edit");
  },
  deleteUser: async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await prisma.users.delete({
      where: {
        id: id,
      },
    });
  },
};

// get requests for admin
app.get("/welcome", pageRoutes.welcome)
app.get("/admin/edit", pageRoutes.adminEdit);
app.get("/admin/create", pageRoutes.adminCreate);
app.get("/api/users", apiRoutes.getUsers);
app.get("/admin/edit/:id", pageRoutes.adminEditID);
app.get("/admin/manage/:id", pageRoutes.adminManageID)
app.get("/api/getUser/:id", apiRoutes.getSpecificUser);
app.get("/api/getClass/:id", apiRoutes.getClassByID)
app.get("/api/classes", apiRoutes.getClasses);

// post requests
app.post("/api/createUser", apiRoutes.createUser);
app.post("/api/removeFromClass/:id", apiRoutes.removeFromClass)
app.post("/api/createClass", apiRoutes.createClass)
app.post("/api/deleteUser/:id", apiRoutes.deleteUser);
app.post("/api/updateUser/", apiRoutes.updateUser);

// start the server
app.listen(3000, () => {
  console.log(`Server running on port 3000`);
});