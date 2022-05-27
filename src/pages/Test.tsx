import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";

const Test = () => {
  const socketRef = useRef<Socket>();
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const otherVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection>();

  const { roomName } = useParams();

  const getMedia = async () => {
    try {
      // 현재 내 미디어 데이터
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // videoRef에 등록
      if (myVideoRef.current) myVideoRef.current.srcObject = stream;
      if (!(pcRef.current && socketRef.current)) return;

      stream.getTracks().forEach((track) => {
        if (!pcRef.current) return;
        pcRef.current.addTrack(track, stream);
      });

      // 내 candidate 정보를 다른 유저에게 전달해야 한다.
      pcRef.current.onicecandidate = (e) => {
        if (e.candidate) {
          if (!socketRef.current) return;
          console.log("recv candidate");
          socketRef.current.emit("candidate", e.candidate, roomName);
        }
      };

      console.log(pcRef.current);

      pcRef.current.ontrack = (ev) => {
        console.log(ev.streams[0], "상대 Stream 정보");
        console.log(stream, "내 Stream 정보");

        if (otherVideoRef.current) {
          // 상대 비디오 화면에 할당
          otherVideoRef.current.srcObject = ev.streams[0];
        }
      };

      pcRef.current.addEventListener("addstream", (e) => {
        console.log(e);
      });
    } catch (e) {
      console.error(e);
    }
  };

  const createOffer = async () => {
    console.log("create Offer");
    if (!(pcRef.current && socketRef.current)) {
      return;
    }
    try {
      const sdp = await pcRef.current.createOffer();
      pcRef.current.setLocalDescription(sdp);
      console.log("sent the offer");
      socketRef.current.emit("offer", sdp, roomName);
    } catch (e) {
      console.error(e);
    }
  };

  const createAnswer = async (sdp: RTCSessionDescription) => {
    console.log("createAnswer");
    if (!(pcRef.current && socketRef.current)) {
      return;
    }

    try {
      pcRef.current.setRemoteDescription(sdp);
      const answerSdp = await pcRef.current.createAnswer();
      pcRef.current.setLocalDescription(answerSdp);

      console.log("sent the answer");
      socketRef.current.emit("answer", answerSdp, roomName);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    socketRef.current = io("0.0.0.0:8080", {
      withCredentials: true,
      extraHeaders: {
        "my-custom-header": "http://localhost:3000",
      },
    });

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
      console.log("get offer");
      createAnswer(sdp);
    });

    socketRef.current.on("getAnswer", (sdp: RTCSessionDescription) => {
      console.log("get answer");
      if (!pcRef.current) return;
      pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socketRef.current.on(
      "getCandidate",
      async (candidate: RTCIceCandidateInit) => {
        if (!pcRef.current) return;
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("candidate add success");
      },
    );

    getMedia();

    socketRef.current.emit("join_room", {
      room: roomName,
    });

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
        id="remotevideo"
        style={{
          width: 240,
          height: 240,
          backgroundColor: "black",
          marginBottom: "10px",
        }}
        ref={myVideoRef}
        autoPlay
      />
      <video
        id="remotevideo"
        style={{
          width: 240,
          height: 240,
          backgroundColor: "black",
          marginBottom: "10px",
        }}
        ref={otherVideoRef}
        autoPlay
      />
    </div>
  );
};

export default Test;
