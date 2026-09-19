# WatchParty — Real-Time YouTube Watch Party

Watch YouTube videos together in real time: create a room, share the code or
link, and everyone's player stays in sync (play, pause, seek, change video),
with server-enforced, role-based permissions.

## Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router, Axios, Socket.IO client, YouTube IFrame Player API
- **Backend:** Node.js, Express, Socket.IO, JWT auth, bcryptjs
- **Database:** MongoDB + Mongoose

## Project structure

```
watch-party/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/     # YouTubePlayer, ControlBar, ParticipantList, ChatPanel, ...
│       ├── context/        # AuthContext, ToastContext
│       ├── hooks/          # useYouTubeApi
│       ├── pages/          # Home, Room, NotFound
│       └── services/       # api.js (REST), socket.js (Socket.IO client)
├── server/                 # Express + Socket.IO backend
│   ├── controllers/        # authController, roomController
│   ├── middleware/         # auth (JWT), errorHandler
│   ├── models/             # User, Room, ActionRequest, ChatMessage
│   ├── routes/             # authRoutes, roomRoutes
│   ├── sockets/            # index.js (auth + bootstrap), roomSocket.js (all events)
│   └── utils/               # jwt, permissions, youtube URL parsing, room-id generator
├── .env.example
└── package.json             # root convenience scripts
```

## How real-time sync works

1. The **server is the single source of truth** for room state (`currentVideoId`,
   `playbackState`, `currentTime`, `participants`), persisted in MongoDB on the `Room` document.
2. When the host/moderator plays, pauses, seeks, or changes the video, the client emits a
   socket event (`play`, `pause`, `seek`, `change_video`).
3. The server **re-checks the sender's role from the database** (never trusts the client),
   updates the room document, and broadcasts the event to every other socket in the room
   (`socket.broadcast.to(roomId).emit(...)`), so the sender never receives its own event back.
4. Every other client's `YouTubePlayer` calls the matching YouTube IFrame API method
   (`playVideo`, `pauseVideo`, `seekTo`, `loadVideoById`).
5. **Loop prevention:** calling those player methods programmatically also fires the
   player's own `onStateChange`. `YouTubePlayer` sets an `isRemoteUpdate` ref right before
   a remote-triggered call and checks/clears it inside `onStateChange`, so a remote update
   is never re-emitted back to the server as if it were a local action.
6. A newly joining client receives the room's current state immediately via `sync_state`,
   so it starts in sync with everyone already in the room.

## Roles & permission enforcement

Roles: `HOST`, `MODERATOR`, `PARTICIPANT`, `VIEWER`.

- Only `HOST`/`MODERATOR` can play/pause/seek/change video, assign roles, remove
  participants, or transfer host — **enforced server-side** in
  `server/utils/permissions.js`, used identically by the REST routes and the socket
  handlers (`server/sockets/roomSocket.js`). A `PARTICIPANT` manually emitting
  `change_video` (e.g. via devtools) is rejected by the server regardless of what the
  UI shows them.
- `PARTICIPANT`/`VIEWER` can send a **request** (`request_action`) for play/pause/seek/
  change-video; the host/moderator sees it in the "Pending requests" panel and can
  approve or reject it. Only on approval does the server perform and broadcast the action.
- If the host leaves, host status isn't silently dropped — the host must use
  **Transfer host** (participant menu → "Make host") before leaving, or another
  host/moderator remains in control of playback.

## Local setup

### Prerequisites
- Node.js 18+
- A running MongoDB instance (local `mongod`, Docker, or MongoDB Atlas)

### 1. Install dependencies

```bash
npm run install:all
```

(equivalent to running `npm install` inside both `server/` and `client/`)

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env`:

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/watchparty
JWT_SECRET=replace_this_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

`client/.env` defaults already point at `http://localhost:5000`, which matches the
server defaults above.

### 3. Run it

From the project root (runs both server and client together):

```bash
npm run dev
```

Or in two terminals:

```bash
npm run dev:server   # http://localhost:5000
npm run dev:client   # http://localhost:5173
```

Open `http://localhost:5173`, create a room, and open the room link in a second
browser tab (or incognito window) to test synchronization between two "users".

## REST API summary

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/guest
GET    /api/auth/me

POST   /api/rooms
GET    /api/rooms/:roomId
POST   /api/rooms/:roomId/join
DELETE /api/rooms/:roomId

GET    /api/rooms/:roomId/participants
PATCH  /api/rooms/:roomId/participants/:userId/role
DELETE /api/rooms/:roomId/participants/:userId
POST   /api/rooms/:roomId/transfer-host
```

All room routes require `Authorization: Bearer <token>`.

## WebSocket events

**Client → Server:** `join_room`, `leave_room`, `play`, `pause`, `seek`,
`change_video`, `assign_role`, `remove_participant`, `transfer_host`,
`request_action`, `approve_request`, `reject_request`, `chat_message`

**Server → Client:** `sync_state`, `user_joined`, `user_left`, `role_assigned`,
`participant_removed`, `host_transferred`, `play`, `pause`, `seek`,
`change_video`, `incoming_request`, `request_resolved`, `chat_message`,
`you_were_removed`, `room_closed`, `error_message`

## Notes on the auth model

To keep the flow frictionless (like most watch-party products), joining just
requires a display name — the backend creates a lightweight `User` document
(`isGuest: true`) and issues a normal JWT for it, so every socket connection and
REST call is still authenticated and every role check happens against the
database, never against client-supplied data. `POST /api/auth/register` and
`POST /api/auth/login` are also implemented (bcrypt-hashed passwords) for anyone
who wants a persistent account instead.
