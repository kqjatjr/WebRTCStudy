import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import io, { Socket } from "socket.io-client";
import { WebRTCUser } from "../types";
import styles from "./VideoCall.module.scss";

const VideoCall = () => {
  const socketRef = useRef<Socket>();
  const pcRef = useRef<RTCPeerConnection>();
  const [users, setUsers] = useState<WebRTCUser[]>([]);
  const [nickname] = useState(sessionStorage.getItem("nickname"));
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream>();
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const { roomName } = useParams();

  const navigate = useNavigate();

  const getLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      if (!socketRef.current) return;
      socketRef.current.emit("join_room", {
        room: roomName,
        email: nickname,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const createPeerConnection = async (socketId: string, email: string) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      });

      pc.onicecandidate = (e) => {
        if (!(socketRef.current && e.candidate)) return;
        console.log("icecandidate!!!!");
        socketRef.current.emit("candidate", {
          candidate: e.candidate,
          candidateSend: socketRef.current.id,
          candidateReciveID: socketId,
        });
      };

      pc.oniceconnectionstatechange = (e) => {
        console.log(e);
      };

      pc.ontrack = (e) => {
        console.log("track!");
        setUsers((prev) => {
          return prev
            .filter((user) => user.id !== socketId)
            .concat({
              id: socketId,
              email,
              stream: e.streams[0],
            });
        });
      };

      if (localStreamRef.current) {
        console.log("localstream add");
        localStreamRef.current.getTracks().forEach((track) => {
          if (!localStreamRef.current) return;
          pc.addTrack(track, localStreamRef.current);
        });
      } else {
        console.log("no local stream");
      }

      return pc;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  };

  const setVideoTracks = async () => {
    try {
      // 현재 내 미디어 데이터
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // videoRef에 등록
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
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

        if (remoteVideoRef.current) {
          // 상대 비디오 화면에 할당
          remoteVideoRef.current.srcObject = ev.streams[0];
        }
      };

      pcRef.current.addEventListener("addstream", (e) => {
        console.log(e);
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Offer를 새로운 유저에게 전달
  const createOffer = async () => {
    console.log("create offer");
    if (!(pcRef.current && socketRef.current)) return;
    try {
      const sdp = await pcRef.current.createOffer();
      // peerConnection localDescription에 내 sdp 등록
      pcRef.current.setLocalDescription(sdp);
      console.log("sent offer");
      socketRef.current.emit("offer", sdp, roomName);
    } catch (e) {
      console.error(e);
    }
  };

  const createAnswer = async (sdp: RTCSessionDescription) => {
    if (!(pcRef.current && socketRef.current)) return;
    try {
      pcRef.current.setRemoteDescription(sdp);
      const mySdp = await pcRef.current.createAnswer();
      pcRef.current.setLocalDescription(mySdp);
      console.log("sent answer");
      socketRef.current.emit("answer", mySdp, roomName);
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

    setVideoTracks();

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

  const onClickLeaveBtn = () => {
    if (socketRef.current) {
      socketRef.current?.disconnect();
    }
    navigate("/");
  };

  return (
    <div className={styles.container}>
      <div className={styles.myVideo}>
        <video
          style={{
            width: 240,
            height: 240,
            backgroundColor: "black",
            marginBottom: "10px",
          }}
          muted
          ref={localVideoRef}
          autoPlay
        />
        <div>
          <button onClick={onClickLeaveBtn}>나가기</button>
        </div>
      </div>
      <div className={styles.someoneVideo}>
        <video
          id="remotevideo"
          style={{
            width: 240,
            height: 240,
            backgroundColor: "black",
            marginBottom: "10px",
          }}
          ref={remoteVideoRef}
          autoPlay
        />
      </div>
    </div>
  );
};

export default VideoCall;