import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoCallModal from "./VideoCallModal";
import axios from "axios";

const API_BASE = "https://skillswap-cd9o.onrender.com";

const LiveChat = ({ token }) => {
  const { chatId } = useParams();
  const navigate = useNavigate();

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(null);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  useEffect(() => {
    try {
      if (!token) return;
      const payload = JSON.parse(atob(token.split(".")[1]));
      const userId = payload?.id || payload?.userId || null;
      const userName = payload?.name || "You";
      setCurrentUserId(userId);
      setCurrentUser({ _id: userId, name: userName });
    } catch {
      setCurrentUserId(null);
      setCurrentUser(null);
    }
  }, [token]);

  const fetchChat = useCallback(async () => {
    if (!chatId || !token) return;

    try {
      setLoadingChat(true);
      setError(null);

      const res = await axios.get(`${API_BASE}/api/chat/request/${chatId}`, {
        headers: authHeaders(),
      });

      setChat(res.data);
      setMessages(res.data.messages || []);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || "Chat not found");
      setLoading(false);
    } finally {
      setLoadingChat(false);
    }
  }, [chatId, token, authHeaders]);

  useEffect(() => {
    if (chatId) fetchChat();
  }, [chatId, fetchChat]);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const startVideoLesson = () => {
    if (!currentUserId || !isConnected) return;

    setMessages((prev) => [
      ...prev,
      {
        _id: `system-${Date.now()}`,
        type: "system",
        content: `${currentUser?.name || "User"} started a video lesson! Click to join.`,
        senderId: currentUserId,
        senderName: currentUser?.name || "You",
        createdAt: new Date(),
      },
    ]);

    setShowVideoCall(true);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !currentUser?._id || uploadingFile) return;
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const content = newMessage.trim();

    const optimisticMessage = {
      _id: tempId,
      content,
      senderId: currentUser._id,
      senderName: currentUser.name,
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");

    ws.current.send(
      JSON.stringify({
        type: "send-message",
        token,
        chatRoomId: chatId,
        content,
      })
    );
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !currentUser?._id) return;

    const file = files[0];
    setUploadingFile(file.name);

    const tempId = `file-${Date.now()}`;
    const fileMessage = {
      _id: tempId,
      type: "file",
      filename: file.name,
      filesize: (file.size / 1024 / 1024).toFixed(2) + " MB",
      senderId: currentUser._id,
      senderName: currentUser.name,
      timestamp: new Date(),
      uploading: true,
    };

    setMessages((prev) => [...prev, fileMessage]);
    scrollToBottom();

    const formData = new FormData();
    formData.append("chatId", chatId);
    formData.append("file", file);

    try {
      const res = await axios.post(`${API_BASE}/api/chat/upload`, formData, {
        headers: {
          ...authHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });

      const realMessage = {
        _id: res.data.messageId || tempId,
        type: "file",
        filename: file.name,
        filesize: (file.size / 1024 / 1024).toFixed(2) + " MB",
        fileUrl: `${API_BASE}/uploads/${res.data.filename}`,
        senderId: currentUser._id,
        senderName: currentUser.name,
        timestamp: new Date(),
        read: false,
      };

      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? realMessage : msg))
      );
      setUploadingFile(null);
    } catch {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? { ...msg, error: true } : msg))
      );
      setUploadingFile(null);
    } finally {
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (!chatId || !currentUserId || !token) return;

    const connectWS = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (
        ws.current &&
        (ws.current.readyState === WebSocket.OPEN ||
          ws.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const ws = new WebSocket(
  `${process.env.REACT_APP_API_URL.replace("https", "wss")}/ws`
);

      ws.current.onopen = () => {
        setIsConnected(true);
        ws.current.send(
          JSON.stringify({
            type: "join",
            token,
            chatRoomId: chatId,
          })
        );
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "video-invite" && data.chatRoomId === chatId) {
            setMessages((prev) => [
              ...prev,
              {
                _id: `system-${Date.now()}`,
                type: "system",
                content: `${data.senderName} started a video lesson! Click to join.`,
                senderId: data.senderId,
                senderName: data.senderName,
                createdAt: new Date(),
              },
            ]);
            return;
          }

          if (data.type === "new-message" && data.chatRoomId === chatId) {
            setMessages((prev) => {
              const savedMessage = data.message;
              const exists = prev.some(
                (msg) => String(msg._id) === String(savedMessage._id)
              );

              if (exists) return prev;

              const withoutTempOwnText = prev.filter((msg) => {
                if (msg.type !== "text") return true;
                const senderId =
                  msg.senderId || msg.sender?._id || msg.sender?.toString();

                return !(
                  String(senderId) === String(currentUserId) &&
                  msg.content === savedMessage.content &&
                  String(savedMessage.sender?._id || savedMessage.sender) ===
                    String(currentUserId)
                );
              });

              return [...withoutTempOwnText, savedMessage];
            });
            return;
          }
        } catch {}
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        ws.current = null;
        reconnectTimeoutRef.current = setTimeout(connectWS, 2000);
      };

      ws.current.onerror = () => {
        setIsConnected(false);
      };
    };

    connectWS();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [chatId, currentUserId, token]);

  const goBack = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    navigate("/chatrooms");
  };

  if (loading || !currentUserId || loadingChat) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            border: "6px solid rgba(255,255,255,0.3)",
            borderTop: "6px solid #00d4ff",
            borderRadius: 50,
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%)",
          color: "white",
          padding: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h2 style={{ color: "#ef4444", marginBottom: 20 }}>❌ {error}</h2>
        <button
          onClick={goBack}
          style={{
            background: "linear-gradient(135deg, #00d4ff, #0099cc)",
            color: "white",
            padding: "16px 32px",
            border: "none",
            borderRadius: 30,
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ← Back to Chats
        </button>
      </div>
    );
  }

  const partner = chat?.participants?.find(
    (p) => String(p?._id) !== String(currentUserId)
  );

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            padding: "24px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(20px)",
            display: "flex",
            alignItems: "center",
            gap: 20,
            zIndex: 10001,
            position: "sticky",
            top: 0,
          }}
        >
          <button
            onClick={goBack}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "12px 16px",
              border: "none",
              borderRadius: 25,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>

          <div style={{ flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                background: "linear-gradient(135deg, #00d4ff, #60f0ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              💬 {partner?.name || "Partner"}
            </h1>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 14,
                opacity: 0.8,
              }}
            >
              {isConnected && (
                <span style={{ color: "#10b981", fontWeight: 600 }}>● Live</span>
              )}
              <span>{messages.length} messages</span>
            </div>
          </div>
        </div>

        <div
          ref={messagesContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 32px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {messages.map((msg, idx) => {
            const messageId = msg._id || `msg-${idx}`;
            const senderId =
              msg.senderId || msg.sender?._id || msg.sender?.toString();
            const isOwnMessage =
              String(senderId) === String(currentUserId);

            if (msg.type === "system") {
              return (
                <div key={messageId}>
                  <div
                    style={{
                      alignSelf: "center",
                      maxWidth: "80%",
                      margin: "20px 0",
                      background: "linear-gradient(135deg, #667eea, #764ba2)",
                      padding: "16px 24px",
                      borderRadius: 25,
                      textAlign: "center",
                      border: "2px solid rgba(255,255,255,0.2)",
                      cursor: "pointer",
                    }}
                    onClick={() => setShowVideoCall(true)}
                  >
                    <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>
                      🎥 {msg.content}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 400,
                          display: "block",
                          marginTop: 4,
                        }}
                      >
                        ✨ <strong>Click to JOIN Video Lesson</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            if (msg.type === "file") {
              return (
                <div
                  key={messageId}
                  style={{
                    alignSelf: isOwnMessage ? "flex-end" : "flex-start",
                    maxWidth: "75%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      background: isOwnMessage
                        ? "linear-gradient(135deg, #10b981, #059669)"
                        : "rgba(255,255,255,0.15)",
                      padding: "20px",
                      borderRadius: 24,
                      backdropFilter: "blur(15px)",
                      border: `2px solid ${
                        isOwnMessage
                          ? "rgba(16,185,129,0.5)"
                          : "rgba(255,255,255,0.2)"
                      }`,
                      minWidth: 220,
                    }}
                  >
                    {msg.uploading && (
                      <div style={{ textAlign: "center", color: "#fbbf24" }}>
                        ⏳ Uploading {msg.filename}...
                      </div>
                    )}

                    {msg.error && (
                      <div style={{ textAlign: "center", color: "#ef4444" }}>
                        ❌ Upload failed
                      </div>
                    )}

                    {msg.fileUrl && (
                      <>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: "bold",
                            marginBottom: 8,
                          }}
                        >
                          📎 {msg.filename}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.8,
                            marginBottom: 12,
                          }}
                        >
                          {msg.filesize || "File"}
                        </div>

                        <a
                          href={msg.fileUrl}
                          download={msg.filename}
                          style={{
                            background: "#00d4ff",
                            color: "white",
                            padding: "10px 20px",
                            borderRadius: 20,
                            textAlign: "center",
                            fontSize: 14,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "block",
                          }}
                        >
                          💾 Download File
                        </a>
                      </>
                    )}
                  </div>

                  <small
                    style={{
                      opacity: 0.6,
                      fontSize: 12,
                      textAlign: isOwnMessage ? "right" : "left",
                      marginTop: 4,
                    }}
                  >
                    {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              );
            }

            return (
              <div
                key={messageId}
                style={{
                  alignSelf: isOwnMessage ? "flex-end" : "flex-start",
                  maxWidth: "75%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    background: isOwnMessage
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : "rgba(255,255,255,0.15)",
                    padding: "16px 20px",
                    borderRadius: 24,
                    backdropFilter: "blur(15px)",
                    border: isOwnMessage
                      ? "1px solid rgba(16,185,129,0.5)"
                      : "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      lineHeight: 1.4,
                      color: isOwnMessage ? "white" : "#e2e8f0",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>

                <small
                  style={{
                    opacity: 0.6,
                    fontSize: 12,
                    textAlign: isOwnMessage ? "right" : "left",
                    marginTop: 4,
                  }}
                >
                  {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        <div
          style={{
            padding: 32,
            borderTop: "1px solid rgba(255,255,255,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                uploadingFile ? `⏳ Uploading ${uploadingFile}...` : "Type message..."
              }
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={!!uploadingFile}
              style={{
                flex: 1,
                padding: "18px 24px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: 30,
                background: "rgba(255,255,255,0.08)",
                color: "white",
                fontSize: 16,
                outline: "none",
              }}
            />

            <label
              htmlFor="file-upload"
              style={{
                background: uploadingFile
                  ? "rgba(251,191,36,0.5)"
                  : "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "white",
                padding: "18px 16px",
                borderRadius: 30,
                cursor: "pointer",
                fontSize: 18,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                minWidth: 60,
                border: "none",
              }}
            >
              📎
            </label>

            <input
              id="file-upload"
              type="file"
              style={{ display: "none" }}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.mp4,.txt"
              disabled={!!uploadingFile}
            />

            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !isConnected || !!uploadingFile}
              style={{
                background:
                  isConnected && newMessage.trim() && !uploadingFile
                    ? "linear-gradient(135deg, #00d4ff, #0099cc)"
                    : "rgba(255,255,255,0.2)",
                color: "white",
                padding: "18px 32px",
                border: "none",
                borderRadius: 30,
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                minWidth: 100,
              }}
            >
              {uploadingFile ? "⏳" : isConnected ? "Send" : "Connecting..."}
            </button>
          </div>

          <button
            onClick={startVideoLesson}
            disabled={!currentUserId || !isConnected}
            style={{
              background:
                currentUserId && isConnected
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "rgba(255,255,255,0.2)",
              color: "white",
              padding: "20px 24px",
              border: "none",
              borderRadius: 30,
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              width: "100%",
            }}
          >
            🎥 START VIDEO LESSON
          </button>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          div::-webkit-scrollbar { width: 8px; }
          div::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 10px; }
          div::-webkit-scrollbar-thumb { background: #00d4ff; border-radius: 10px; }
        `}</style>
      </div>

      {showVideoCall && (
        <VideoCallModal
          chatId={chatId}
          currentUserName={currentUser?.name}
          onLeave={() => {
            setShowVideoCall(false);
          }}
        />
      )}
    </>
  );
};

export default LiveChat;