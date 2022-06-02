import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import io, { Socket } from "socket.io-client";
import Video from "../components/Video";
import { WebRTCUser } from "../types";
import styles from "./VideoCall.module.scss";

const pc_config = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

const SOCKET_SERVER_URL = "http://localhost:8080";

const VideoCall2 = () => {
  const socketRef = useRef<Socket>();
  const pcRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const [users, setUsers] = useState<WebRTCUser[]>([]);
  const [email] = useState(sessionStorage.getItem("nickname") || "");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream>();

  console.log(pcRef.current);

  const { roomName } = useParams();

  const navigate = useNavigate();

  const getLocalStream = useCallback(async () => {
    console.log("두번?");
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 240,
          height: 240,
        },
      });

      localStreamRef.current = localStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      if (!socketRef.current) return;
      socketRef.current.emit("join_room", {
        room: roomName,
        email: email,
      });
    } catch (e) {
      console.log(`getUserMedia error: ${e}`);
    }
  }, []);

  const createPeerConnection = useCallback(
    (socketID: string, email: string) => {
      console.log("create PC");
      try {
        const pc = new RTCPeerConnection(pc_config);
        console.log("my peerConnection", pc, "###");

        pc.onicecandidate = (e) => {
          if (!(socketRef.current && e.candidate)) return;
          console.log("onicecandidate");
          socketRef.current.emit("candidate", {
            candidate: e.candidate,
            candidateSendID: socketRef.current.id,
            candidateReceiveID: socketID,
          });
        };

        pc.ontrack = (e) => {
          console.log("ontrack success");
          setUsers((oldUsers) =>
            oldUsers
              .filter((user) => user.id !== socketID)
              .concat({
                id: socketID,
                email,
                stream: e.streams[0],
              }),
          );
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
    },
    [],
  );

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL);

    socketRef.current.on(
      "all_users",
      (allUsers: Array<{ id: string; email: string }>) => {
        allUsers.forEach(async (user) => {
          if (!localStreamRef.current) return;
          const pc = createPeerConnection(user.id, user.email);
          if (!(pc && socketRef.current)) return;
          pcRef.current = { ...pcRef.current, [user.id]: pc };
          try {
            const localSdp = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            console.log("create offer success");
            await pc.setLocalDescription(localSdp);
            socketRef.current.emit("offer", {
              sdp: localSdp,
              offerSendID: socketRef.current.id,
              offerSendEmail: email,
              offerReceiveID: user.id,
            });
          } catch (e) {
            console.error(e);
          }
        });
      },
    );

    socketRef.current.on(
      "getOffer",
      async (data: {
        sdp: RTCSessionDescription;
        offerSendID: string;
        offerSendEmail: string;
      }) => {
        const { sdp, offerSendID, offerSendEmail } = data;
        console.log("get offer");
        if (!localStreamRef.current) return;
        const pc = createPeerConnection(offerSendID, offerSendEmail);
        if (!(pc && socketRef.current)) return;
        pcRef.current = { ...pcRef.current, [offerSendID]: pc };
        try {
          console.log(sdp);
          await pc.setRemoteDescription(sdp);
          console.log("answer set remote description success");
          const localSdp = await pc.createAnswer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
          });
          await pc.setLocalDescription(new RTCSessionDescription(localSdp));
          socketRef.current.emit("answer", {
            sdp: localSdp,
            answerSendID: socketRef.current.id,
            answerReceiveID: offerSendID,
          });
        } catch (e) {
          console.error(e);
        }
      },
    );

    socketRef.current.on(
      "getAnswer",
      (data: { sdp: RTCSessionDescription; answerSendID: string }) => {
        const { sdp, answerSendID } = data;
        console.log("get answer");
        const pc: RTCPeerConnection = pcRef.current[answerSendID];
        if (!pc) return;
        pc.setRemoteDescription(sdp);
      },
    );

    socketRef.current.on(
      "getCandidate",
      async (data: {
        candidate: RTCIceCandidateInit;
        candidateSendID: string;
      }) => {
        console.log("get candidate");
        const pc: RTCPeerConnection = pcRef.current[data.candidateSendID];
        if (!pc) return;
        await pc.addIceCandidate(data.candidate);
        console.log("candidate add success");
      },
    );

    socketRef.current.on("user_exit", (data: { id: string }) => {
      if (!pcRef.current[data.id]) return;
      pcRef.current[data.id].close();
      delete pcRef.current[data.id];
      setUsers((oldUsers) => oldUsers.filter((user) => user.id !== data.id));
    });

    getLocalStream();

    return () => {
      socketRef.current?.disconnect();

      users.forEach((user) => {
        if (!pcRef.current[user.id]) return;
        pcRef.current[user.id].close();
        delete pcRef.current[user.id];
      });
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
      {users.map((user, index) => {
        return <Video key={index} email={user.email} stream={user.stream} />;
      })}
    </div>
  );
};

export default VideoCall2;
