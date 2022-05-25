import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import io, { Socket } from "socket.io-client";

// type TProps = {
//   socket: Socket & { nickname?: string };
// };

const ChatView = () => {
  const socketRef = useRef<Socket>();
  const pcRef = useRef<RTCPeerConnection>();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const { roomName } = useParams();

  const setVideoTracks = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      if (!(pcRef.current && socketRef.current)) return;

      stream.getTracks().forEach((track) => {
        if (!pcRef.current) return;
        pcRef.current.addTrack(track, stream);
      });

      pcRef.current.onicecandidate = (e) => {
        if (e.candidate) {
          if (!socketRef.current) return;
          console.log("recv candidate");
          socketRef.current.emit("candidate", e.candidate);
        }
      };

      pcRef.current.addEventListener("addstream", (e) => {
        console.log(e);
      });

      pcRef.current.ontrack = (ev) => {
        console.log(ev.streams[0], "###");
        console.log(stream, "###");
        console.log("add remotetrack success");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = ev.streams[0];
        }
      };
      socketRef.current.emit("join_room", {
        room: roomName,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const createOffer = async () => {
    console.log("create offer");
    if (!(pcRef.current && socketRef.current)) return;
    try {
      const sdp = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(new RTCSessionDescription(sdp));
      console.log("sent offer");
      socketRef.current.emit("offer", sdp);
    } catch (e) {
      console.error(e);
    }
  };

  const createAnswer = async (sdp: RTCSessionDescription) => {
    if (!(pcRef.current && socketRef.current)) return;
    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const mySdp = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(new RTCSessionDescription(mySdp));
      console.log("sent answer");
      socketRef.current.emit("answer", mySdp);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    socketRef.current = io("localhost:8080");

    pcRef.current = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    socketRef.current.on("all_users", (allUsers: Array<{ id: string }>) => {
      if (allUsers.length > 0) {
        createOffer();
        console.log(11);
      }
    });

    socketRef.current.on("getOffer", (sdp: RTCSessionDescription) => {
      //console.log(sdp);
      console.log("get offer");
      createAnswer(sdp);
    });

    socketRef.current.on("getAnswer", (sdp: RTCSessionDescription) => {
      console.log("get answer");
      if (!pcRef.current) return;
      pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      //console.log(sdp);
    });

    socketRef.current.on(
      "getCandidate",
      async (candidate: RTCIceCandidateInit) => {
        if (!pcRef.current) return;
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("candidate add success");
      },
    );

    setVideoTracks();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  return (
    <div>
      <video
        style={{
          width: 240,
          height: 240,
          margin: 5,
          backgroundColor: "black",
        }}
        muted
        ref={localVideoRef}
        autoPlay
      />
      <video
        id="remotevideo"
        style={{
          width: 240,
          height: 240,
          margin: 5,
          backgroundColor: "black",
        }}
        ref={remoteVideoRef}
        autoPlay
      />
    </div>
  );
};

export default ChatView;
