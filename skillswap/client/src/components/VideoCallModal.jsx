import React from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";

const VideoCallModal = ({ chatId, currentUserName, onLeave }) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          background: "#111827",
          color: "white",
        }}
      >
        <h3 style={{ margin: 0 }}>Video Call - skillswap-{chatId}</h3>

        <button
          onClick={onLeave}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Leave
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={`skillswap-${chatId}`}
          userInfo={{
            displayName: currentUserName || "User",
          }}
          configOverwrite={{
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          }}
          loadingComponent={
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "18px",
                background: "#020617",
              }}
            >
              Loading video call...
            </div>
          }
          onReadyToClose={onLeave}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = "100%";
            iframeRef.style.width = "100%";
            iframeRef.style.border = "0";
          }}
        />
      </div>
    </div>
  );
};

export default VideoCallModal;