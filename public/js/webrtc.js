const socket = io();

const configuration = {
	'iceServers': [{
		'url': 'stun:stun.l.google.com:19302'
	}]
};


let rtcPeerConn;
const remoteVideo = document.querySelector("#remoteVideo");
const localVideo = document.querySelector("#localVideo");

socket.on('signal', function(data) {

    if (data.signal_type == 'signaling') {
		if (!rtcPeerConn) startSignaling(data.room);
		var message = JSON.parse(data.user_data);
		if (message.sdp) {
			rtcPeerConn.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
				// if we received an offer, we need to answer
				if (rtcPeerConn.remoteDescription.type == 'offer') {
					rtcPeerConn.createAnswer().then( (desc) => {
						rtcPeerConn.setLocalDescription(desc, function () {
							console.log("sending local description");
							socket.emit('signal', {
								"signal_type":"signaling",
								"command":"SDP",
								"room": data.room,
								"user_data": JSON.stringify({ 'sdp': rtcPeerConn.localDescription })
							});
						}, logError)
					});
				}
			}, logError);
		}
		else {
			rtcPeerConn.addIceCandidate(
                new RTCIceCandidate({
                    sdpMLineIndex: message.label,
                    candidate: message.candidate
                })
            );
		}
    }

});

function startSignaling(room = "myroom") {

	console.log("starting signaling...");
	rtcPeerConn = new RTCPeerConnection(configuration);
	
	// send any ice candidates to the other peer
	rtcPeerConn.onicecandidate = function (evt) {
		if (evt.candidate) {
            socket.emit('signal',
                {
                    "signal_type":"signaling",
                    "command":"icecandidate",
                    "room": room,
                    "user_data": JSON.stringify(
                        { 'label': event.candidate.sdpMLineIndex,
                        'candidate': evt.candidate.candidate }
                    )
                }
            );
        }
		console.log("completed sending an ice candidate...");
	};
	
	// let the 'negotiationneeded' event trigger offer generation
	rtcPeerConn.onnegotiationneeded = function () {
		console.log("on negotiation called");
		rtcPeerConn.createOffer().then( (desc) => {
				rtcPeerConn.setLocalDescription(desc, function () {
					console.log("sending local description");
					socket.emit('signal', {
						"signal_type":"signaling",
						"command":"SDP",
						"room": room,
						"user_data": JSON.stringify({ 'sdp': rtcPeerConn.localDescription })
					});
				}, logError)
			}
		);
	};
	
	// once remote stream arrives, show it in the main video element
	rtcPeerConn.onaddstream = function (evt) {
		console.log("going to add their stream...");
		remoteVideo.srcObject = evt.stream;
	};
	
	// get a local stream, show it in our video tag and add it to be sent
	navigator.getUserMedia({
		'audio': false,
		'video': true
	}, function (stream) {
		console.log("going to display my stream...");
		localVideo.srcObject = stream;
		rtcPeerConn.addStream(stream);
	}, logError);
			  
}
			
function logError(error) {
    // console.log('ERROR:' +  error)
}