import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";

const Container = styled.div`
  position: relative;
  display: inline-block;
  width: 240px;
  height: 270px;
  margin: 5px;
`;

const VideoContainer = styled.video`
  width: 240px;
  height: 240px;
  background-color: black;
`;

const UserLabel = styled.p`
  display: inline-block;
  position: absolute;
  top: 230px;
  left: 0px;
`;

interface TProps {
  email: string | undefined;
  stream: MediaStream;
  muted?: boolean;
}

const Video = ({ email, stream, muted }: TProps) => {
  console.log("Video Component");
  const ref = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  console.log(stream);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
    if (muted) setIsMuted(muted);
  }, [stream, muted]);

  return (
    <Container>
      <VideoContainer ref={ref} muted={isMuted} autoPlay />
      <UserLabel>{email} 님</UserLabel>
    </Container>
  );
};

export default Video;
