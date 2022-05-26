import React, { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";

// type TProps = {
//   socket: Socket;
// };
const Home = () => {
  const [roomNumber, setRoomNumber] = useState("");
  const [nickname, setNickname] = useState("");

  const navigate = useNavigate();

  const onChangeRoomNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomNumber(e.target.value);
  };

  const onChangeNickname = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
  };

  const onSubmit = () => {
    sessionStorage.setItem("nickname", nickname);
    setRoomNumber("");
    navigate(`/chat/${roomNumber}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };

  return (
    <div style={{ margin: "0 auto" }}>
      <div>
        <input
          placeholder="만들 방번호를 입력하세요"
          value={roomNumber}
          onChange={onChangeRoomNumber}
        />
        <input
          placeholder="사용하실 닉네임을 입력하세요"
          value={nickname}
          onChange={onChangeNickname}
        />
        <button onClick={onSubmit} onKeyDown={onKeyDown}>
          방 입장
        </button>
      </div>
    </div>
  );
};

export default Home;
