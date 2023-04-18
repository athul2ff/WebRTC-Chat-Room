let APP_ID = "612fd3f7a78d4656b2b85859c13567df";

let token = null;
let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;

let localStream;
let remoteStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

let init = async () => {
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid, token });

  channel = client.createChannel("main");
  await channel.join();

  channel.on("MemberJoined", handleUserJoined);

  client.on("MessageFromPeer", handleMessageFromPeer);

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
  document.getElementById("user-1").srcObject = localStream;
};

let handleMessageFromPeer = async (message, memberId) => {
  message = JSON.parse(message.text);

  if (message.type === "offer") {
    createAnswer(memberId, message.offer);
  }

  if (message.type === "answer") {
    addAnswer(message.answer);
  }

  if (message.type === "candidate") {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.candidate);
    }
  }
};

let handleUserJoined = async (memberId) => {
  console.log("A new user joined the channel:", memberId);
  createOffer(memberId);
};

let createPeerConnection = async (memberId) => {
  peerConnection = new RTCPeerConnection(servers);
  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;

  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    document.getElementById("user-1").srcObject = localStream;
  }

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      client.sendMessageToPeer(
        {
          text: JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
          }),
        },
        memberId
      );
    }
  };
};

let createOffer = async (memberId) => {
  await createPeerConnection(memberId);
  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "offer", offer: offer }) },
    memberId
  );
};

let createAnswer = async (memberId, offer) => {
  await createPeerConnection(memberId);

  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "answer", answer: answer }) },
    memberId
  );
};

let addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer);
  }
};

init();
