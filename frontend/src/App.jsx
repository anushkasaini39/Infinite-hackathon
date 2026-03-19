import { useEffect, useState, useRef, useCallback } from "react";
import "./App.css";
import io from "socket.io-client";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const socket = io("https://realtime-code-editor-zwp3.onrender.com");

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ indent: "-1" }, { indent: "+1" }],
  [{ align: [] }],
  ["blockquote", "code-block"],
  ["link"],
  ["clean"],
];

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [content, setContent] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const quillRef = useRef(null);
  const isRemoteChange = useRef(false);

  useEffect(() => {
    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    socket.on("documentUpdate", (newContent) => {
      isRemoteChange.current = true;
      setContent(newContent);
    });

    socket.on("userTyping", (user) => {
      setTyping(`${user.slice(0, 10)}... is typing`);
      setTimeout(() => setTyping(""), 2000);
    });

    socket.on("titleUpdate", (newTitle) => {
      setDocTitle(newTitle);
    });

    return () => {
      socket.off("userJoined");
      socket.off("documentUpdate");
      socket.off("userTyping");
      socket.off("titleUpdate");
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setContent("");
    setDocTitle("Untitled Document");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const handleContentChange = useCallback(
    (value) => {
      if (isRemoteChange.current) {
        isRemoteChange.current = false;
        return;
      }
      setContent(value);
      socket.emit("documentChange", { roomId, content: value });
      socket.emit("typing", { roomId, userName });
    },
    [roomId, userName]
  );

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setDocTitle(newTitle);
    socket.emit("titleChange", { roomId, title: newTitle });
  };

  const wordCount = content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <div className="join-logo">📄</div>
          <h1>Join Document Room</h1>
          <p className="join-subtitle">Collaborate in real-time</p>
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
          />
          <input
            type="text"
            placeholder="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div className="doc-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-icon">📄</span>
          <span className="sidebar-brand">DocRoom</span>
        </div>

        <div className="room-info">
          <p className="room-label">Room ID</p>
          <p className="room-id-text">{roomId}</p>
          <button onClick={copyRoomId} className="copy-button">
            {copySuccess ? "✓ Copied!" : "Copy ID"}
          </button>
        </div>

        <div className="users-section">
          <h3>
            <span className="dot-green">●</span> Collaborators ({users.length})
          </h3>
          <ul>
            {users.map((user, index) => (
              <li key={index}>
                <span className="avatar">{user[0]?.toUpperCase()}</span>
                {user.length > 12 ? user.slice(0, 12) + "…" : user}
              </li>
            ))}
          </ul>
        </div>

        {typing && <p className="typing-indicator">✏️ {typing}</p>}

        <div className="word-count">
          <span>{wordCount} words</span>
        </div>

        <button className="leave-button" onClick={leaveRoom}>
          Leave Room
        </button>
      </div>

      {/* Main editor area */}
      <div className="editor-area">
        <div className="doc-title-bar">
          <input
            className="doc-title-input"
            value={docTitle}
            onChange={handleTitleChange}
            placeholder="Document Title"
          />
        </div>
        <div className="quill-wrapper">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={handleContentChange}
            modules={{ toolbar: TOOLBAR_OPTIONS }}
            placeholder="Start typing your document here…"
          />
        </div>
      </div>
    </div>
  );
};

export default App;
