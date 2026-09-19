// src/pages/Room.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getSocket } from "../services/socket";
import { roomApi, extractErrorMessage } from "../services/api";
import YouTubePlayer from "../components/YouTubePlayer";
import ControlBar from "../components/ControlBar";
import ParticipantList from "../components/ParticipantList";
import ChatPanel from "../components/ChatPanel";
import RoomTopBar from "../components/RoomTopBar";
import UsernameModal from "../components/UsernameModal";

const TABS = ["participants", "chat"];

export default function Room() {
  const { roomId } = useParams();
  const { user, loginAsGuest, loading: authLoading } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connecting, setConnecting] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [mobileTab, setMobileTab] = useState("participants");

  const playerRef = useRef(null);
  const socketRef = useRef(null);

  // Role and Permission calculations
  const myParticipant = room?.participants?.find(
    (p) => String(p.userId) === String(user?.id)
  );
  const isHost = Boolean(room && user && String(room.hostId) === String(user.id));
  const isModerator = myParticipant?.role === "MODERATOR";

  // Host/Moderators always have control; regular participants only if room setting is enabled
  const canControl = Boolean(
    isHost ||
    isModerator ||
    (room?.allowParticipantControl && myParticipant?.role === "PARTICIPANT")
  );

  const connectAndJoin = useCallback(async () => {
    try {
      const res = await roomApi.join(roomId);
      const initialRoom = res?.data?.room || res?.room || res;

      if (initialRoom) {
        setRoom(initialRoom);
        setConnecting(false);
      }
    } catch (err) {
      pushToast(extractErrorMessage(err) || "Failed to join room", "error");
      navigate("/");
      return;
    }

    const socket = getSocket();
    socketRef.current = socket;

    socket.on("connect_error", (err) => {
      pushToast(err.message || "Could not connect to the room", "error");
    });

    socket.on("sync_state", (state) => {
      setRoom(state);
      setConnecting(false);
    });

    socket.on("user_joined", ({ participants }) => {
      setRoom((prev) => (prev ? { ...prev, participants } : prev));
    });

    socket.on("user_left", ({ participants }) => {
      setRoom((prev) => (prev ? { ...prev, participants } : prev));
    });

    socket.on("role_assigned", ({ participants }) => {
      setRoom((prev) => (prev ? { ...prev, participants } : prev));
    });

    socket.on("participant_removed", ({ participants }) => {
      setRoom((prev) => (prev ? { ...prev, participants } : prev));
    });

    socket.on("host_transferred", ({ newHostId, participants }) => {
      setRoom((prev) =>
        prev ? { ...prev, hostId: newHostId, participants } : prev
      );
      pushToast("Host has been transferred", "info");
    });

    socket.on("you_were_removed", () => {
      pushToast("You were removed from this room", "error");
      navigate("/");
    });

    socket.on("room_closed", () => {
      pushToast("The room was closed", "info");
      navigate("/");
    });

    // Room Setting Update (Permission toggle)
    socket.on("room_settings_updated", ({ allowParticipantControl }) => {
      setRoom((prev) =>
        prev ? { ...prev, allowParticipantControl } : prev
      );
      pushToast(
        allowParticipantControl
          ? "Host unlocked playback controls for all participants"
          : "Host restricted playback controls to host and moderators",
        "info"
      );
    });

    // Synchronized playback events
    socket.on("play", ({ currentTime }) => {
      setRoom((prev) =>
        prev ? { ...prev, playbackState: "playing", currentTime } : prev
      );
      playerRef.current?.applyRemotePlay(currentTime);
    });

    socket.on("pause", ({ currentTime }) => {
      setRoom((prev) =>
        prev ? { ...prev, playbackState: "paused", currentTime } : prev
      );
      playerRef.current?.applyRemotePause(currentTime);
    });

    socket.on("seek", ({ time }) => {
      setRoom((prev) => (prev ? { ...prev, currentTime: time } : prev));
      playerRef.current?.applyRemoteSeek(time);
    });

    socket.on("change_video", ({ videoId }) => {
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              currentVideoId: videoId,
              playbackState: "paused",
              currentTime: 0,
            }
          : prev
      );
      playerRef.current?.applyRemoteChangeVideo(videoId);
      pushToast("The video was changed", "info");
    });

    socket.off("chat_message");
    socket.on("chat_message", (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    socket.on("error_message", ({ error }) => {
      pushToast(error, "error");
    });

    const joinSocketRoom = () => {
      socket.emit("join_room", { roomId }, (ack) => {
        if (!ack?.ok) {
          pushToast(ack?.error || "Failed to sync with room", "error");
        } else if (ack.room) {
          setRoom(ack.room);
          setConnecting(false);
        }
      });
    };

    if (socket.connected) {
      joinSocketRoom();
    } else {
      socket.once("connect", joinSocketRoom);
      socket.connect();
    }
  }, [roomId, navigate, pushToast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setNeedsUsername(true);
      setConnecting(false);
      return;
    }

    connectAndJoin();

    return () => {
      const socket = socketRef.current;
      if (!socket) return;
      socket.off("connect_error");
      socket.off("sync_state");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("role_assigned");
      socket.off("participant_removed");
      socket.off("host_transferred");
      socket.off("you_were_removed");
      socket.off("room_closed");
      socket.off("room_settings_updated");
      socket.off("play");
      socket.off("pause");
      socket.off("seek");
      socket.off("change_video");
      socket.off("chat_message");
      socket.off("error_message");
    };
  }, [authLoading, user, connectAndJoin]);

  async function handleGuestJoin(username) {
    const res = await loginAsGuest(username);
    if (!res?.ok) {
      pushToast(res?.error || "Failed to sign in as guest", "error");
      return;
    }
    setNeedsUsername(false);
    setConnecting(true);
  }

  function leaveRoom() {
    socketRef.current?.emit("leave_room");
    navigate("/");
  }

  // --- Playback Handlers ---
  function handleLocalPlay(currentTime) {
    const time =
      typeof currentTime === "number"
        ? currentTime
        : playerRef.current?.getCurrentTime() ?? 0;

    setRoom((prev) =>
      prev ? { ...prev, playbackState: "playing", currentTime: time } : prev
    );
    socketRef.current?.emit("play", { roomId, currentTime: time });
  }

  function handleLocalPause(currentTime) {
    const time =
      typeof currentTime === "number"
        ? currentTime
        : playerRef.current?.getCurrentTime() ?? 0;

    setRoom((prev) =>
      prev ? { ...prev, playbackState: "paused", currentTime: time } : prev
    );
    socketRef.current?.emit("pause", { roomId, currentTime: time });
  }

  function handleLocalSeek(time) {
    setRoom((prev) => (prev ? { ...prev, currentTime: time } : prev));
    socketRef.current?.emit("seek", { roomId, time });
  }

  function handleChangeVideo(videoUrl) {
    socketRef.current?.emit("change_video", { roomId, videoUrl });
  }

  // --- Room Settings Handler (Host Only) ---
  function handleUpdateSettings(allowParticipantControl) {
    socketRef.current?.emit("update_room_settings", {
      roomId,
      allowParticipantControl,
    });
  }

  function handleSendMessage(text) {
    socketRef.current?.emit("chat_message", { text });
  }

  function handleChangeRole(userId, role) {
    socketRef.current?.emit("assign_role", { userId, role, roomId });
  }

  function handleRemove(userId) {
    socketRef.current?.emit("remove_participant", { userId, roomId });
  }

  function handleTransferHost(userId) {
    socketRef.current?.emit("transfer_host", { newHostId: userId, roomId });
  }

  if (needsUsername) {
    return (
      <UsernameModal
        title="Enter a display name to join this room"
        confirmLabel="Join room"
        onConfirm={handleGuestJoin}
        onClose={() => navigate("/")}
      />
    );
  }

  if (connecting || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center text-reel-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-reel-600 border-t-marquee-500" />
          <p>Connecting to room {roomId}…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <RoomTopBar roomId={room.roomId} onLeave={leaveRoom} />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <div className="flex flex-1 flex-col gap-4">
          <YouTubePlayer
            ref={playerRef}
            videoId={room.currentVideoId}
            playbackState={room.playbackState}
            currentTimeProp={room.currentTime}
            canControl={canControl}
            onLocalPlay={handleLocalPlay}
            onLocalPause={handleLocalPause}
            onLocalSeek={handleLocalSeek}
          />

          <ControlBar
            canControl={canControl}
            playbackState={room.playbackState}
            onPlay={() =>
              handleLocalPlay(playerRef.current?.getCurrentTime() ?? room.currentTime)
            }
            onPause={() =>
              handleLocalPause(playerRef.current?.getCurrentTime() ?? room.currentTime)
            }
            onChangeVideo={handleChangeVideo}
          />
        </div>

        {/* Desktop Side Panels */}
        <div className="hidden w-80 shrink-0 flex-col gap-4 lg:flex">
          <div className="rounded-2xl border border-reel-700/70 bg-reel-800/60 p-3">
            <ParticipantList
              participants={room.participants || []}
              currentUserId={user.id}
              isHost={isHost}
              hostId={room.hostId}
              allowParticipantControl={room.allowParticipantControl}
              onUpdateSettings={handleUpdateSettings}
              onChangeRole={handleChangeRole}
              onRemove={handleRemove}
              onTransferHost={handleTransferHost}
            />
          </div>
          <div className="h-96">
            <ChatPanel
              messages={messages}
              currentUserId={user.id}
              onSend={handleSendMessage}
            />
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="flex flex-col gap-3 lg:hidden">
          <div className="flex gap-2 rounded-xl border border-reel-700 bg-reel-800/60 p-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={`focus-ring flex-1 rounded-lg py-1.5 text-sm capitalize transition ${
                  mobileTab === tab
                    ? "bg-marquee-500 font-semibold text-reel-950"
                    : "text-reel-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {mobileTab === "participants" ? (
            <div className="rounded-2xl border border-reel-700/70 bg-reel-800/60 p-3">
              <ParticipantList
                participants={room.participants || []}
                currentUserId={user.id}
                isHost={isHost}
                hostId={room.hostId}
                allowParticipantControl={room.allowParticipantControl}
                onUpdateSettings={handleUpdateSettings}
                onChangeRole={handleChangeRole}
                onRemove={handleRemove}
                onTransferHost={handleTransferHost}
              />
            </div>
          ) : (
            <div className="h-96">
              <ChatPanel
                messages={messages}
                currentUserId={user.id}
                onSend={handleSendMessage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}