import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";

type TProps = {
  socket: Socket & { nickname?: string };
};

type TConstraints = {
  video: boolean;
  audio: boolean;
};

const ViewChat = ({ socket }: TProps) => {
  const [message, setMessage] = useState<string[]>([]);
  const [currentRoomName, setCurrentRoomName] = useState("");
  const [mute, setMute] = useState(false);
  const [muteBtnText, setMuteBtnText] = useState("음소거 하기");
  const [camera, setCamera] = useState(true);
  const [cameraText, setCameraText] = useState("카메라 끄기");
  const [myStream, setMyStream] = useState<MediaStream>();
  const [nickname] = useState(sessionStorage.getItem("nickname") || "");
  const [userCount, setUserCount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>();
  const [cameraSelect, setCameraSelect] = useState<string>();
  const [myPeerConnection] = useState<RTCPeerConnection>(
    () => new RTCPeerConnection(),
  );
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(
          (device) => device.kind === "videoinput",
        );
        setCameraList(cameras);
      } catch (e) {
        console.log(e);
      }
    };

    const makeConnection = () => {
      myStream
        ?.getTracks()
        .forEach((track) => myPeerConnection?.addTrack(track, myStream));
    };

    const getMedia = async () => {
      if (!videoRef.current) {
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: cameraSelect
            ? { deviceId: cameraSelect }
            : { facingMode: "user" },
          audio: true,
        });
        setMyStream(stream);
        videoRef.current.srcObject = stream;
        videoRef.current.muted = false;
        getCameras();
      } catch (err) {
        console.log(err);
      }
    };

    getMedia();
    makeConnection();

    return () => {
      if (myStream) {
        myStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  useEffect(() => {
    if (!nickname) {
      navigate("/");
    }
    socket.on("welcome", async (nickname, countRoom) => {
      const offer = await myPeerConnection?.createOffer();
      myPeerConnection.setLocalDescription(offer);
      socket.emit("offer", offer, currentRoomName);
      setUserCount(countRoom);
      setMessage((prev) => [...prev, `${nickname}님이 입장하셨습니다.`]);
    });

    socket.on("offer", (offer) => {
      myPeerConnection.setRemoteDescription(offer);
    });

    socket.on("bye", (nickname, countRoom) => {
      setUserCount(countRoom);
      setMessage((prev) => [...prev, `${nickname}님이 퇴장하셨습니다..`]);
    });

    socket.on("roomInfo", (room, countRoom) => {
      setUserCount(countRoom);
      setCurrentRoomName(room);
    });

    socket.on("new_message", (msg) => {
      setMessage((prev) => [...prev, msg]);
    });

    return () => {
      socket.off();
      sessionStorage.removeItem("nickname");
    };
  }, []);

  const onClickLeaveBtn = () => {
    socket.disconnect();
    navigate("/");
  };

  const onChangeInputValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const onClickMessageSubmitButton = () => {
    socket.emit(
      "new_message",
      { msg: inputValue, roomName: currentRoomName },
      () => {
        setMessage((prev) => [...prev, `${nickname} : ${inputValue}`]);
      },
    );
    setInputValue("");
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
    myStream
      ?.getVideoTracks()
      .forEach((track) => (track.enabled = !track.enabled));
    if (camera) {
      setCameraText("카메라 끄기");
      setCamera(false);
    } else {
      setCameraText("카메라 켜기");
      setCamera(true);
    }
  };

  const onChangeCamera = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(e.target.value);
    setCameraSelect(e.target.value);
  };

  return (
    <div>
      <div style={{ border: "1px solid", marginBottom: "20px" }}>
        방이름 : {currentRoomName}
      </div>
      <div>현재인원 : {userCount} 명</div>
      <div>
        <div style={{ border: "1px solid", marginBottom: "20px" }}>
          화상통화
        </div>
        <div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: "400px" }}
          />
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
        </div>
      </div>
      <div style={{ border: "1px solid", marginBottom: "20px" }}>채팅</div>
      <div>
        {message &&
          message.map((msg, idx) => {
            return <div key={idx}>{msg}</div>;
          })}
      </div>
      <div>
        <input onChange={onChangeInputValue} value={inputValue} />
        <button onClick={onClickMessageSubmitButton}>전송</button>
      </div>
      <div>
        <button onClick={onClickLeaveBtn}>떠나기</button>
      </div>
    </div>
  );
};
export default ViewChat;
