import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";

type TProps = {
  socket: Socket & { nickname?: string };
};

const View = ({ socket }: TProps) => {
  const [message, setMessage] = useState<string[]>([]);
  const [currentRoomName, setCurrentRoomName] = useState("");
  const [nickname] = useState(sessionStorage.getItem("nickname") || "");
  const [inputValue, setInputValue] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!nickname) {
      navigate("/");
    }
    socket.on("welcome", (nickname) => {
      setMessage((prev) => [...prev, `${nickname}님이 입장하셨습니다.`]);
    });

    socket.on("bye", (nickname) => {
      setMessage((prev) => [...prev, `${nickname}님이 퇴장하셨습니다..`]);
    });

    socket.on("roomInfo", (room) => {
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter") {
      onClickMessageSubmitButton();
    }
  };

  return (
    <div>
      <div style={{ border: "1px solid", marginBottom: "20px" }}>
        방이름 : {currentRoomName}
      </div>
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

export default View;
