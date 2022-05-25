import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Socket } from "socket.io-client";

type TProps = {
  socket: Socket & { nickname?: string };
};

const ChatView = ({ socket }: TProps) => {
  const [mute, setMute] = useState(false);
  const [muteBtnText, setMuteBtnText] = useState("음소거 하기");
  const [camera, setCamera] = useState(true);
  const [cameraText, setCameraText] = useState("카메라 끄기");
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>([]);
  const [myStream, setMyStream] = useState<MediaStream>();
  const [cameraSelect, setCameraSelect] = useState<string>();
  const [nickname] = useState(sessionStorage.getItem("nickname"));
  const myPeerConnection = useRef<RTCPeerConnection>();
  const { roomName } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    myPeerConnection.current = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    myPeerConnection.current.ontrack = (e) => {
      console.log(e.streams[0]);
    };

    startMedia();
  }, []);

  const setVidoeTracks = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!nickname) {
      navigate("/");
    }
    socket.on("welcome", async (nickname, countRoom) => {
      console.log("한분 추가요");
      const offer = await myPeerConnection.current?.createOffer();
      myPeerConnection.current?.setLocalDescription(offer);
      console.log("sent the offer");
      socket.emit("offer", offer, roomName);
    });

    socket.on("offer", async (offer) => {
      console.log("recv offer");
      await myPeerConnection.current?.setRemoteDescription(offer);
      const answer = await myPeerConnection.current?.createAnswer();
      await myPeerConnection.current?.setLocalDescription(answer);
      console.log("sent the answer");
      console.log(myPeerConnection);
      socket.emit("answer", answer, roomName);
    });

    socket.on("answer", async (answer) => {
      console.log("recv answer", answer);
      await myPeerConnection.current?.setRemoteDescription(answer);
      console.log(myPeerConnection);
    });

    socket.on("ice", (ice) => {
      console.log("received candidate");
      myPeerConnection.current?.addIceCandidate(ice);
    });

    return () => {
      socket.off();
      sessionStorage.removeItem("nickname");
    };
  }, [myPeerConnection]);

  const startMedia = async () => {
    let myStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    await getMedia(myStream);
    makeConnection(myStream);
  };

  const getMedia = async (data: MediaStream) => {
    if (!videoRef.current) {
      return;
    }
    try {
      videoRef.current.srcObject = data;
      await getCameras();
      setMyStream(data);
    } catch (e) {
      console.log(e);
    }
  };

  const getCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");
      setCameraList(cameras);
    } catch (e) {
      console.log(e);
    }
  };

  const makeConnection = (myStream: MediaStream) => {
    myPeerConnection.current?.addEventListener("icecandidate", handleIce);

    myStream
      ?.getTracks()
      .forEach((track) => myPeerConnection.current?.addTrack(track, myStream));
  };

  const handleIce = (e: RTCPeerConnectionIceEvent) => {
    console.log("sent the Ice");

    socket.emit("ice", e.candidate, roomName);
  };

  const onClickMuteBtn = () => {
    myStream
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = !track.enabled));
    if (!mute) {
      setMuteBtnText("음소거 하기");
      setMute(true);
    } else {
      setMuteBtnText("음소거 해제");
      setMute(false);
    }
  };

  const onClickCameraTurnBtn = () => {
    if (!camera) {
      setCameraText("카메라 끄기");
      setCamera(true);
    } else {
      setCameraText("카메라 켜기");
      setCamera(false);
    }
    myStream
      ?.getVideoTracks()
      .forEach((track) => (track.enabled = !track.enabled));
  };

  const onChangeCamera = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(e.target.value);
    setCameraSelect(e.target.value);
  };

  const onClickLeaveBtn = () => {
    socket.disconnect();
    navigate("/");
  };

  return (
    <div>
      <div>
        <video ref={videoRef} autoPlay playsInline style={{ width: "400px" }} />
      </div>
      <div>
        <button onClick={onClickMuteBtn}>{muteBtnText}</button>
        <button onClick={onClickCameraTurnBtn}>{cameraText}</button>
      </div>
      <div>
        <select onChange={onChangeCamera} value={cameraSelect}>
          {cameraList?.map((item) => {
            return (
              <option key={item.deviceId} value={item.deviceId}>
                {item.label}
              </option>
            );
          })}
        </select>
      </div>
      <div>
        <button onClick={onClickLeaveBtn}>떠나기</button>
      </div>
    </div>
  );
};

export default ChatView;
