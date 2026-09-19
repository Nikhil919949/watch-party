// backend/utils/permissions.js

// Allow all active room members to control playback
const PLAYBACK_ROLES = new Set(["HOST", "MODERATOR", "PARTICIPANT"]);
const MANAGEMENT_ROLES = new Set(["HOST"]);

function findParticipant(room, userId) {
  const id = userId.toString();
  return room.participants.find((p) => p.userId.toString() === id) || null;
}

function canControlPlayback(room, userId) {
  const participant = findParticipant(room, userId);
  if (!participant) return false;
  return PLAYBACK_ROLES.has(participant.role);
}

function canManageParticipants(room, userId) {
  const participant = findParticipant(room, userId);
  if (!participant) return false;
  return MANAGEMENT_ROLES.has(participant.role);
}

function isHost(room, userId) {
  return room.hostId.toString() === userId.toString();
}

module.exports = {
  findParticipant,
  canControlPlayback,
  canManageParticipants,
  isHost,
};