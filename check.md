- 읽기 쉬운 코드가 좋은 코드이다! (무조건적인 성능 집착을 버려라)

- camelCase로 작성한다.
  - 중간 글자들은 대문자로 시작하지만 첫 글자가 소문자인 경우에는 낙타와 모양이 비슷하다하여 카멜 케이스라고 한다.

```js
// bad
const OBJEcttsssss = {};
const this_is_my_object = {};
function c() {}

// good
const thisIsMyObject = {};
function thisIsMyFunction() {}
```

- 상수 선언만 대문자 SNAKE_CASE 로 작성한다.
  - 언더바(\_)를 사용해 단어의 의미를 구분해준다. 언더바가 들어 있는 표현 방식을 뱀처럼 생겼다고 하여 스네이크 케이스라고 한다.

```js
// bad
const inside_directory = () => {
  // ...
};

// good
const SOCKET_SERVER = "localhsot:8080";
```

- 모든 변수 및 함수의 이름은 의미가 정확해야한다.

```js
// bad
const a = () => {
  // ...
};

// good
const onClickLeaveButton = () => {
  // ...
};
```

- 클래스 종속적인 상수 정보는 정적 멤버변수로 선언한다.
- 의미를 알기 쉬운 단어를 쓰고 동사를 앞에 위치시킨다. (예: getDeviceId, isBusy)

```js
// bad
const usernameChange = () => {
  //...
};

// good
const changeUsername = () => {
  //..
};
```

- 함수형 프로그래밍을 지향하자!
- 하나의 함수는 하나의 작업을 처리하도록 구현한다. (code formatter에 의해 줄바꿈되는 것을 제외하고 15줄을 넘으면 하나의 작업을 하는 함수가 절대 아니다.)

```js
// bad
const onChangeDefaultCodec = (
  data: RTCSessionDescriptionInit
) => {
  const res = sdpTransform.parse(data.sdp || "");

  if (parser.getBrowser().name === "Firefox") {
    const setCodec = sdpTransform
      .parsePayloads(res.media[1].payloads || "")
      .reduce((acc, cur) => {
        if (cur === "97") {
          acc.unshift(cur);
          return acc;
        }
        acc.push(cur);
        return acc;
      }, [] as number[]);

    res.media[1].payloads = setCodec.join(" ");
    return sdpTransform.write(res);
  }

   const setCodec = sdpTransform
      .parsePayloads(res.media[1].payloads || "")
      .reduce((acc, cur) => {
        if (cur === "127") {
          acc.unshift(cur);
          return acc;
        }
        acc.push(cur);
        return acc;
      }, [] as number[]);

    res.media[1].payloads = setCodec.join(" ");

    return sdpTransform.write(res);
};


// good
const onChangeDefaultCodec = (
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
```

- 인터페이스와 추상클래스를 적극 활용하자.
- 클래스의 변경이 필요한 경우 상속하여 처리하는 것을 우선으로 한다.
- 에러 던지기를 아끼지 말자.
- 의미없는 기다림을 만들지 말자. (몇초 후에 실행)
- setInterval 사용 금지!
- 주석은 한국어로 최대한 자세하게 작성한다.
- magic number, magic string을 만들지 말자.
- prototype 쓰지마!
- 안쓰는 코드는 남겨두지 말자!
