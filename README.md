# Live Polling System

A real-time, production-ready polling application for teachers and students with live results, state recovery, and WebSocket communication.

## Features

✅ **Teacher Features**
- Create polls with custom questions and options
- Set configurable time limits (30-120 seconds)
- View live results in real-time as students vote
- Access poll history with final aggregate results
- Resume polls after page refresh (state recovery)

✅ **Student Features**
- Join polls by entering name (unique per session/tab)
- Receive questions instantly via real-time updates
- Synchronized timer that adjusts for late joins
- Submit answers within time limit
- View live results after voting
- Resume voting after page refresh

✅ **System Resilience**
- State recovery on page refresh for both roles
- Duplicate vote prevention at database level
- Race condition handling with MongoDB transactions
- Automatic timer synchronization across clients
- Late join timer adjustment

## Tech Stack

**Frontend:**
- TypeScript
- Tailwind CSS v4
-React

**Backend:**

- Node.js
- MongoDB
- Express/Socket.io (for production WebSocket)

**Database:**
- MongoDB (or compatible service like MongoDB Atlas)



1. Click "I'm a Teacher" on welcome screen
2. Enter your name
3. Create a poll with:
   - A question
   - 2-4 options
   - Time limit (30-120 seconds)
4. Click "Create Poll" to broadcast to all students
5. Watch live results update in real-time
6. View poll history in the sidebar

### For Students

1. Click "I'm a Student" on welcome screen
2. Enter your name
3. Wait for a question to be posted
4. Select your answer
5. Submit before time runs out
6. View live results after voting

### State Recovery

- All state is automatically saved to browser localStorage
- If you refresh the page:
  - Teachers will see their current poll and history
  - Students will rejoin their session and continue from where they left off
  - Timers are synchronized with the server

or contact the development team.
