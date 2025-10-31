# Quick Setup Guide

## 1. Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ (`node --version`)
- ✅ npm (`npm --version`)
- ✅ MongoDB running locally OR MongoDB Atlas account

## 2. MongoDB Setup

### Option A: Local MongoDB (Recommended for Development)

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Verify it's running:**
```bash
brew services list | grep mongodb
# Should show "started"
```

**Windows:**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer
3. Start MongoDB service from Services panel

**Linux (Ubuntu/Debian):**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

### Option B: MongoDB Atlas (Cloud Database)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account and cluster
3. Click "Connect" → "Connect your application"
4. Copy connection string
5. Replace `<password>` with your database password

## 3. Application Setup

### Create Environment File

```bash
# Copy the example file
cp .env.example .env.local
```

### Edit .env.local

**For local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/hci_grader
```

**For MongoDB Atlas:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hci_grader?retryWrites=true&w=majority
```

## 4. Start the Application

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

## 5. First Steps

1. **Create an Assignment**
   - Click "New Assignment" button
   - Fill in title and description
   - Click "Create Assignment"

2. **Add Questions**
   - Click "Manage" on the assignment
   - Go to "Questions & Rubrics" tab
   - Click "Add Question"
   - Enter question text and max points

3. **Create Rubrics**
   - Under each question, click "Add Rubric"
   - Define criteria (e.g., "Excellent", "Good", "Needs Improvement")
   - Set point values
   - Add descriptions

4. **Add a Submission**
   - Go to "Submissions & Grading" tab
   - Click "Add Submission"
   - Enter student info and answers

5. **Grade the Submission**
   - Click "Grade" on the submission
   - Select rubrics for each answer
   - Add custom feedback
   - Adjust points if needed

6. **Export Results**
   - Click "Export CSV" to download grades

## Troubleshooting

### "Failed to fetch assignments"
- Check if MongoDB is running
- Verify `.env.local` connection string
- Check terminal for error messages

### Port 3000 already in use
```bash
npm run dev -- -p 3001
```

### MongoDB connection refused
```bash
# macOS - restart MongoDB
brew services restart mongodb-community

# Linux - restart MongoDB
sudo systemctl restart mongod

# Windows - restart from Services panel
```

### Clear MongoDB data (start fresh)
```bash
# Connect to MongoDB shell
mongosh

# Switch to database
use hci_grader

# Drop all collections
db.dropDatabase()

# Exit
exit
```

## Production Deployment

### Build for production:
```bash
npm run build
npm start
```

### Deploy to Vercel:
```bash
npm i -g vercel
vercel
```

Remember to add `MONGODB_URI` environment variable in Vercel dashboard!

## Need Help?

- Check the full README.md for detailed documentation
- Review Next.js docs: https://nextjs.org/docs
- MongoDB docs: https://docs.mongodb.com/
- Mongoose docs: https://mongoosejs.com/docs/

---

**You're all set! 🎉**
Start by creating your first assignment at http://localhost:3000

