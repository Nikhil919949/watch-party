const { customAlphabet } = require("nanoid");

// Unambiguous alphabet (no 0/O/1/I) for room codes that are easy to read/type/share.
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nanoid = customAlphabet(alphabet, 6);

function generateRoomId() {
  return nanoid();
}

module.exports = generateRoomId;
