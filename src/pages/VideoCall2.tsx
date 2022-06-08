import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import io, { Socket } from "socket.io-client";
import Video from "../components/Video";
import { WebRTCUser } from "../types";
import * as sdpTransform from "sdp-transform";
import UAParser from "ua-parser-js";
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
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream>();
  const [users, setUsers] = useState<WebRTCUser[]>([]);
  const [email] = useState(sessionStorage.getItem("nickname") || "");
  const { roomName } = useParams();

  const parser = new UAParser();
  const navigate = useNavigate();

  const getLocalStream = useCallback(async () => {
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
      try {
        const pc = new RTCPeerConnection(pc_config);

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

  const onChangeDefaultCodec = (pc: RTCPeerConnection, value: string) => {
    const tcvr = pc.getTransceivers()[1];
    const codecs = RTCRtpReceiver.getCapabilities("video")?.codecs || [];
    const changeCodec: RTCRtpCodecCapability[] = [];

    for (let i = 0; i < codecs.length; i++) {
      if (codecs[i].mimeType === value) {
        changeCodec.push(codecs[i]);
      }
    }

    if (tcvr.setCodecPreferences !== undefined) {
      tcvr.setCodecPreferences(changeCodec);
    }
  };

  const onChangeSdpCodec = (
    data: RTCSessionDescriptionInit,
    browserH264Codec: number,
  ) => {
    const res = sdpTransform.parse(data.sdp || "");

    const setCodec = sdpTransform
      .parsePayloads(res.media[1].payloads || "")
      .reduce((acc, cur) => {
        if (cur === browserH264Codec) {
          acc.unshift(cur);
          return acc;
        }
        acc.push(cur);
        return acc;
      }, [] as number[]);
    res.media[1].payloads = setCodec.join(" ");

    return sdpTransform.write(res);
  };

  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);
    socketRef.current = socket;

    socketRef.current.on(
      "existing_users",
      (existingUsers: Array<{ id: string; email: string }>) => {
        existingUsers.forEach(async (user) => {
          if (!localStreamRef.current) return;
          const pc = createPeerConnection(user.id, user.email);

          if (!(pc && socketRef.current)) return;
          // onChangeDefaultCodec(pc, "video/H264");
          pcRef.current = { ...pcRef.current, [user.id]: pc };
          try {
            const localSdp = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });

            if (parser.getBrowser().name === "Firefox") {
              localSdp.sdp = onChangeSdpCodec(localSdp, 97);
            } else {
              localSdp.sdp = onChangeSdpCodec(localSdp, 127);
            }

            console.log(localSdp.sdp, "QQQQ");

            await pc.setLocalDescription(localSdp);
            socketRef.current.emit("offer", {
              sdp: localSdp,
              // 보내는이
              offerSendID: socketRef.current.id,
              // 보내는 사람 닉네임
              offerSendEmail: email,
              // 받는이
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
          await pc.setRemoteDescription(sdp);
          console.log("answer set remote description success");
          const localSdp = await pc.createAnswer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
          });

          // if (parser.getBrowser().name === "Firefox") {
          //   localSdp.sdp = onChangeSdpCodec(localSdp, 97);
          // } else {
          //   localSdp.sdp = onChangeSdpCodec(localSdp, 127);
          // }

          await pc.setLocalDescription(localSdp);
          socketRef.current.emit("answer", {
            sdp: localSdp,
            // 보내는이 ( 신규 접속자 )
            answerSendID: socketRef.current.id,
            // 받는이
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
