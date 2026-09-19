const { Server } = require("socket.io");
const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");
const registerRoomHandlers = require("./roomSocket");

let ioInstance = null;

function getIO() {
  return ioInstance;
}

function initSocket(httpServer, clientUrl) {
  const io = new Server(httpServer, {
    cors: {
      origin: clientUrl,
      credentials: true,
    },
  });

  // Every socket connection must present a valid JWT (issued by /api/auth/*).
  // We never trust a role or username sent by the client over the socket;
  // identity comes only from the verified token + database lookup.
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) return next(new Error("Authentication token required"));

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.sub);
      if (!user) return next(new Error("User no longer exists"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket);
  });

  ioInstance = io;
  return io;
}

module.exports = { initSocket, getIO };
