import express from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import path from "path";

const prisma = new PrismaClient();
const app = express();
const adminPaths = ["/admin/"];
const restrictedPaths = ["/welcome", ...adminPaths];
