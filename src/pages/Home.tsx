import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

type TProps = {
  socket: Socket;
  joinRoom: React.Dispatch<React.SetStateAction<boolean>>;
};
const Home = ({ socket, joinRoom }: TProps) => {
  const [roomNumber, setRoomNumber] = useState("");

  const onChangeRoomNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomNumber(e.target.value);
  };

  const onSubmit = () => {
    socket.emit("enter_room", { roomName: roomNumber });
    setRoomNumber("");
    joinRoom(true);
  };

  return (
    <div>
      <input
        placeholder="만들 방번호를 입력하세요"
        value={roomNumber}
        onChange={onChangeRoomNumber}
      />
      <button onClick={onSubmit}>방 입장</button>
    </div>
  );
};

export default Home;
