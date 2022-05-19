import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

type TProps = {
  socket: Socket;
  leaveRoom: React.Dispatch<React.SetStateAction<boolean>>;
};

const View = ({ socket, leaveRoom }: TProps) => {
  const [message, setMessage] = useState<string[]>([]);
  console.log(message);

  useEffect(() => {
    socket.on("welcome", () => {
      setMessage((prev) => [...prev, "환s영합니다"]);
    });
  }, [socket]);

  const onClickLeaveBtn = () => {
    leaveRoom(false);
  };

  return (
    <div>
      <div>
        {message &&
          message.map((msg) => {
            return <div>{msg}</div>;
          })}
      </div>
      <div>
        <button onClick={onClickLeaveBtn}>떠나기</button>
      </div>
    </div>
  );
};

export default View;
