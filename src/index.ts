import express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import { authenticateToken, AuthRequest } from "./middleware/auth";
import multer from "multer";
import { uploadToS3 } from "./utils/s3";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = 4000;

app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5173", "https://jobboard-frontend-alpha.vercel.app"],
  credentials: true,
}));

const upload = multer({ storage: multer.memoryStorage() });

app.get("/", (req, res) => {
  res.send("Job Board API is running - Deployed via CI/CD!");
});

// Register a new user
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.users.create({
      data: { name, email, password_hash },
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find the user
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare password with stored hash
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Create a job (requires login)
app.post("/jobs", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, description, company } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const job = await prisma.jobs.create({
      data: {
        title,
        description,
        company,
        user_id: req.userId!,
      },
    });

    res.status(201).json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Get all jobs (public)
app.get("/jobs", async (req, res) => {
  try {
    const jobs = await prisma.jobs.findMany();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Apply to a job (requires login, with resume upload)
app.post(
  "/applications",
  authenticateToken,
  upload.single("resume"),
  async (req: AuthRequest, res) => {
    try {
      const { job_id } = req.body;

      if (!job_id) {
        return res.status(400).json({ error: "job_id is required" });
      }

      // Check job exists
      const job = await prisma.jobs.findUnique({ where: { id: Number(job_id) } });
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      let resumeUrl: string | null = null;

      // If a file was uploaded, send it to S3
      if (req.file) {
        resumeUrl = await uploadToS3(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
      }

      const application = await prisma.applications.create({
        data: {
          job_id: Number(job_id),
          user_id: req.userId!,
          resume_url: resumeUrl,
        },
      });

      res.status(201).json(application);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Something went wrong" });
    }
  }
);

// Get my applications (requires login)
app.get("/applications", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const applications = await prisma.applications.findMany({
      where: { user_id: req.userId },
      include: { jobs: true },
    });
    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await prisma.users.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
