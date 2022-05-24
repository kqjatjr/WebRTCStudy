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
  const [myPeerConnection, setMyPeerConnection] = useState<RTCPeerConnection>(
    () => new RTCPeerConnection(),
  );
  const { roomName } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    startMedia();

    socket.on("welcome", async (nickname, countRoom) => {
      console.log("한분 추가요");
      const offer = await myPeerConnection?.createOffer();
      myPeerConnection?.setLocalDescription(offer);
      console.log("sent the offer");
      socket.emit("offer", offer, roomName);
    });

    socket.on("offer", async (offer) => {
      console.log("recv offer");
      await myPeerConnection.setRemoteDescription(offer);
      const answer = await myPeerConnection?.createAnswer();
      await myPeerConnection.setLocalDescription(answer);
      console.log("sent the answer");
      console.log(myPeerConnection);
      socket.emit("answer", answer, roomName);
    });

    socket.on("answer", async (answer) => {
      console.log("recv answer", answer);
      await myPeerConnection.setRemoteDescription(answer);
      console.log(myPeerConnection);
    });

    return () => {
      socket.off();
    };
  }, []);

  const startMedia = async () => {
    let myStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    await getMedia(myStream);
    return makeConnection(myStream);
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
    const peerConnection = new RTCPeerConnection();

    peerConnection.addEventListener("icecandidate", handleIce);

    myStream
      ?.getTracks()
      .forEach((track) => peerConnection?.addTrack(track, myStream));

    return peerConnection;
  };

  const handleIce = (e: RTCPeerConnectionIceEvent) => {
    console.log(e);
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
