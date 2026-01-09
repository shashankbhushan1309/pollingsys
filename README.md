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
- Next.js 16 (React Server Components)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- WebSocket for real-time communication

**Backend:**
- Next.js API Routes
- Node.js
- MongoDB with Mongoose ODM
- Express/Socket.io (for production WebSocket)

**Database:**
- MongoDB (or compatible service like MongoDB Atlas)

## Project Structure

```
.
├── app/
│   ├── api/
│   │   ├── socket/route.ts        # API endpoint for polling actions
│   │   └── ws/route.ts            # WebSocket fallback
│   ├── layout.tsx                  # Root layout with metadata
│   ├── page.tsx                    # Main page
│   └── globals.css                 # Design tokens & Tailwind config
├── components/
│   ├── PollApp.tsx                 # Main app orchestrator
│   ├── Welcome.tsx                 # Role selection & name entry
│   ├── TeacherDashboard.tsx        # Teacher interface
│   ├── StudentInterface.tsx        # Student interface
│   └── ui/                         # shadcn/ui components
├── hooks/
│   ├── useSocket.ts               # WebSocket connection management
│   ├── usePollState.ts            # Poll state management
│   └── usePollTimer.ts            # Timer countdown logic
├── lib/
│   ├── db.ts                      # MongoDB connection
│   ├── stateRecovery.ts          # LocalStorage state persistence
│   └── services/
│       ├── pollService.ts         # Business logic
│       └── timerService.ts        # Timer management
├── models/
│   ├── Poll.ts                    # Poll schema & model
│   └── Session.ts                 # Session schema & model
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB instance (local or Atlas)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Create a `.env.local` file:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/polling_system

# For production
NEXT_PUBLIC_API_URL=https://your-domain.com
```

3. **Run development server:**

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## How to Use

### For Teachers

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

## API Routes

### POST `/api/socket`

Handles polling actions:

```typescript
// Create poll
{ action: 'createPoll', data: { question, options, timeLimit, teacherId } }

// Get active poll
{ action: 'getActivePoll' }

// Record vote
{ action: 'recordVote', data: { pollId, studentId, studentName, selectedOption, sessionId } }

// Get poll results
{ action: 'getPollResults', data: { pollId } }

// Complete poll
{ action: 'completePoll', data: { pollId } }

// Get poll history
{ action: 'getPollHistory' }

// Register session
{ action: 'registerSession', data: { sessionId, studentName } }
```

## Database Schema

### Poll

```typescript
{
  questionId: String (unique),
  question: String,
  options: [String],
  timeLimit: Number,
  createdBy: String,
  status: 'active' | 'completed',
  startedAt: Date,
  endedAt: Date,
  votes: [{
    studentId: String,
    studentName: String,
    selectedOption: String,
    timestamp: Date,
    sessionId: String,
  }],
  timestamps: true
}
```

### Session

```typescript
{
  sessionId: String (unique),
  studentName: String,
  pollsAnswered: [String],
  connectedAt: Date,
  lastActive: Date,
  timestamps: true
}
```

## Production Deployment

### Vercel (Frontend)

1. Push code to GitHub
2. Create new Vercel project from GitHub
3. Add environment variables in Vercel dashboard
4. Deploy

### Backend Server (Node.js with Socket.io)

For production real-time features, deploy the backend server:

```bash
npm install express socket.io mongoose cors dotenv
```

Create `server.ts` with Socket.io setup (see sample in project).

Deploy to:
- Render
- Railway
- Heroku
- AWS EC2
- DigitalOcean

## Performance Optimization

- Timer uses local client state with server synchronization
- Results update via real-time WebSocket
- Database queries optimized with indexes
- State persistence using localStorage
- Efficient re-renders with React hooks

## Error Handling

- Database connection failures trigger user notifications
- Vote duplicate prevention at DB level
- Timer desync recovery via server sync
- WebSocket reconnection with exponential backoff
- User-friendly error messages

## Future Enhancements

- Chat between teacher and students
- Student removal by teacher
- Custom color schemes per poll
- Export poll results as CSV
- Student anonymity option
- Leaderboards
- Multi-teacher support

## License

MIT License - Feel free to use this for educational purposes.

## Support

For issues or questions, please open an issue on GitHub or contact the development team.
