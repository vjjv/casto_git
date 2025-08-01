import { bootstrapCameraKit, createMediaStreamSource, Transform2D } from "@snap/camera-kit";
import { CanvasRecorder } from './CanvasRecorder.js';
import settings from "./settings";
import helpers from "./helpers";


const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzM4MjM2Njg5LCJzdWIiOiJmYWMzYWZjOS0zOTEyLTRlNTUtYTdiZS03MjJlOGRmYWY4ZjV-UFJPRFVDVElPTn5lOGQ0OTM1NS00YmNlLTRiYWEtODkzNC1lMWNlNmU0ZDM5M2IifQ.6sZB_6aFPL8OW-UO3Y37P7Rev7mzjS9IhNRFk7NelBI';
const LENS_GROUP_ID = 'f7f4e367-f4b3-4de5-8e81-e9c842f2bf0b';

const TARGET_LENS_ID = 'e6b3c3d0-1899-4e66-8a71-5acd4d16d66f';

// global variables
let global = {
    cameraKit: null,
    renderTarget: null,
    // might need another "capture render target" but ignore for now

    session: null,
    userMediaStream: null,
    mediaStreamSource: null,
    lens: null,

    videoProcessor: null,

    currentCamera: 'FRONT',
    canvasRecorder: null,

    // for photo & video record button
    recordButtonReleased: false,

    // for audio monitoring
    audioContexts: [],
    monitorNodes: [],
};

async function start() {

    helpers.overrideConsoleLog(settings.showDebugLog);

    // setup monitor stuff
    setupAudioContextMonitor();
    setupAudioNodeMonitor();

    // init camera kit
    await setupCameraKit();

    // setup buttons
    setupRecordButton();
    setupShareButton();
    setupSwitchCameraButton();

    // setup rwd
    window.addEventListener('resize', updateRenderSize);
}

async function setupCameraKit() {
    const cameraKit = await bootstrapCameraKit({
        apiToken: API_TOKEN
    });
    global.cameraKit = cameraKit;

    const liveRenderTarget = document.getElementById('camerakit-canvas');

    // log pixel density
    console.log(`Device Pixel Ratio : ${window.devicePixelRatio}`);

    // Set canvas properties for better quality
    // if (helpers.isMobile()) {
    //     liveRenderTarget.width = 1080;
    //     liveRenderTarget.height = 1920;
    // }
    // else {
    //     liveRenderTarget.width = 1920;
    //     liveRenderTarget.height = 1080;
    // }

    let dpr = window.devicePixelRatio || 1;

    liveRenderTarget.width = window.innerWidth * dpr;
    liveRenderTarget.height = window.innerHeight * dpr;

    global.renderTarget = liveRenderTarget;

    const session = await cameraKit.createSession({
        liveRenderTarget,
        renderOptions: {
            quality: 'high',
            antialiasing: true
        }
    });
    global.session = session;

    // init camera stream
    await SetCameraSide(settings.defaultCameraType);

    const lens = await cameraKit.lensRepository.loadLens(TARGET_LENS_ID, LENS_GROUP_ID);
    await session.applyLens(lens, { launchParams: { "prenom": window.prenom, "ville": window.ville } });
    console.log('applyLens : ' + window.prenom + '' + window.ville);

}


async function SwitchCameraSide() {
    console.log("switch clicked");
    if (global.currentCamera == 'BACK') {
        return await SetCameraSide('FRONT');
    }
    else {
        return await SetCameraSide('BACK');
    }
}

async function SetCameraSide(toSide) {

    // switch side and prepare the variable for use
    global.currentCamera = toSide;
    let isBackFacing = (toSide == 'BACK');

    // stop the current session if it exists
    if (global.userMediaStream) {
        global.session.pause();
        global.userMediaStream.getVideoTracks()[0].stop();
    }

    // create new stream
    let newMediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
            frameRate: { ideal: settings.recordVideoFrameRate },
            facingMode: isBackFacing ? 'environment' : 'user',
        },
        audio: true,
    });

    const newSource = createMediaStreamSource(newMediaStream, {
        // NOTE: This is important for world facing experiences
        cameraType: isBackFacing ? 'environment' : 'user',
        disableSourceAudio: false,
    });

    await global.session.setSource(newSource);

    if (!isBackFacing) {
        newSource.setTransform(Transform2D.MirrorX);
    }

    // Update render size with high quality settings
    let dpr = window.devicePixelRatio || 1;
    newSource.setRenderSize(window.innerWidth * dpr, window.innerHeight * dpr);

    global.session.play();

    // set references
    global.userMediaStream = newMediaStream;
    global.mediaStreamSource = newSource;
}

function setupAudioContextMonitor() {
    const originalAudioContext = window.AudioContext || window.webkitAudioContext;
    let capturedAudioContext = null;

    window.AudioContext = window.webkitAudioContext = function () {
        capturedAudioContext = new originalAudioContext();
        console.log("Audio context created:", capturedAudioContext);

        global.audioContexts.push(capturedAudioContext);

        return capturedAudioContext;
    };
}

function setupAudioNodeMonitor() {
    // Store the original connect method
    const originalConnect = AudioNode.prototype.connect;

    // Override the AudioNode.prototype.connect method
    AudioNode.prototype.connect = function (destinationNode) {

        // check context id
        // for (let i = 0; i < global.audioContexts.length; i++) {
        //     if (this.context === global.audioContexts[i]) {
        //         console.log("Context id: ", i);
        //     }
        // }

        console.log("Audio Node Connecting: " + this + " to " + destinationNode);

        // if the current node is a gainNode, create another stream node and connect it
        if (destinationNode instanceof AudioDestinationNode) {
            console.log("final node found");

            // create monitor node
            let streamNode = this.context.createMediaStreamDestination();
            global.monitorNodes.push(streamNode);

            // connect current node to the monitor node
            this.connect(streamNode);
        }

        // Call original connect method
        return originalConnect.apply(this, arguments);
    };
}

function setupRecorder() {
    try {

        let monitoredStreams = [];

        // add lens audios into the record stream
        if (settings.recordLensAudio) {
            for (let i = 0; i < global.monitorNodes.length; i++) {
                monitoredStreams.push(global.monitorNodes[i].stream);
            }
        }

        // add user media stream into the record stream
        if (settings.recordMicrophoneAudio) {
            monitoredStreams.push(global.userMediaStream);
        }

        let newRecorder = new CanvasRecorder(
            global.renderTarget,
            monitoredStreams
        );

        global.canvasRecorder = newRecorder;

    } catch (e) {
        console.error('Failed to create recorder:', e);
        alert('Sorry, recording is not supported on your device');
        return;
    }
}

function clickCanvasCapture(relX = 0.5, relY = 0.93) {
    const canvas = document.getElementById('camerakit-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = rect.left + relX * rect.width;
    const y = rect.top + relY * rect.height;

    ['mouseover', 'mouseenter', 'mousedown', 'mouseup', 'click'].forEach(eventType => {
        const event = new MouseEvent(eventType, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            view: window
        });
        canvas.dispatchEvent(event);
    });
}

function setupRecordButton() {
    const recordButton = document.getElementById("record-button");
    let startTimestamp = 0; // use for check how long the button pressed
    let isRecording = false;
    let startEvent = "mousedown";
    // let endEvent = "mouseup";
    let endEvent = "mousedown";

    if (helpers.isMobile()) {
        startEvent = "touchstart";
        endEvent = "touchend";
    }

    /////////////////
    let canvas = document.getElementById('camerakit-canvas');
    var videoStream = canvas.captureStream(30);


        // Create a new stream that combines video and audio tracks
        var combinedStream = new MediaStream();

        // Add video tracks from canvas stream
        videoStream.getVideoTracks().forEach(function (track) {
            combinedStream.addTrack(track);
        });

        // Add audio tracks from microphone stream
        global.userMediaStream.getAudioTracks().forEach(function (track) {
            combinedStream.addTrack(track);
        });

        var mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/mp4' });

        var chunks = [];
        mediaRecorder.ondataavailable = function (e) {
            chunks.push(e.data);
        };

        mediaRecorder.onstop = function (e) {
            var blob = new Blob(chunks, { type: 'video/mp4' });
            chunks = [];
            var videoURL = URL.createObjectURL(blob);

            var video = document.getElementById('recordedVideo');
            if (!video) {
                video = document.createElement('video');
                video.id = 'recordedVideo';
                video.controls = true;
                document.body.appendChild(video);
            }
            video.src = videoURL;

            // share(blob);

            window.open(videoURL, '_blank');
        };




    /////////////




    //START RECORD
    recordButton.addEventListener("mousedown", async () => {
        if (!isRecording) {
            //baba
            mediaRecorder.start();
            recordButton.classList.add("recording");

            // startRecord();
            clickCanvasCapture();
            setTimeout(e => isRecording = true, 1000)
        }
        if (isRecording) {
            //baba
            mediaRecorder.stop();
            recordButton.classList.remove("recording");

            // endRecord();
            setTimeout(e => isRecording = false, 1000)
        }
    });



    async function startRecord() {
        if (global.canvasRecorder == null) {
            setupRecorder();
        }

        // Start recording anyway
        try {
            global.recordButtonReleased = false;
            startTimestamp = Date.now();

            // delay start record
            setTimeout(() => {
                if (global.recordButtonReleased == false) {
                    global.canvasRecorder.start();
                    recordButton.classList.add("recording");
                }
            }, 300);

        } catch (e) {
            console.error('Failed to start recording:', e);
            alert('Failed to start recording. Please try again.');
            return;
        }
    }

    async function endRecord() {
        // Reset the button state
        console.log("== mouse up ==" + isRecording);
        global.recordButtonReleased = true;

        // check button hold time diff
        let nowTimestamp = Date.now();
        let duration = nowTimestamp - startTimestamp;

        console.log("duration: " + duration);

        let isClickEvent = duration < 300;

        if (isClickEvent) {
            global.canvasRecorder.stop();
            recordButton.classList.remove("recording");

            // blink animation
            let effectCanvas = document.getElementById("photo-snapshot-effect");
            effectCanvas.classList.add("animating");

            setTimeout(() => {
                effectCanvas.classList.remove("animating");
            }, 200);

            let saveSnapshotName = settings.snapshotFileName + "_" + new Date().toISOString().replace(/:/g, "-").slice(0, 19);
            global.canvasRecorder.saveSnapshot(saveSnapshotName);
        }
        else {
            // save video
            try {
                global.canvasRecorder.stop();
                recordButton.classList.remove("recording");

                // add date yyyy-mm-dd_hhmmss
                let recordedFileName = settings.recordedFileName + "_" + new Date().toISOString().replace(/:/g, "-").slice(0, 19);
                await global.canvasRecorder.save(recordedFileName);

            } catch (e) {
                console.error('Failed to stop/save recording:', e);
                alert('Failed to save recording. Please try again.');
                return;
            }
        }
    }


}

function setupSwitchCameraButton() {
    const switchButton = document.getElementById("switch-button");

    switchButton.addEventListener("click", async () => {
        try {
            await SwitchCameraSide();
        } catch (error) {
            console.error('Error switching camera:', error);
            alert('Failed to switch camera. Please try again.');
        }
    });
}

function setupShareButton() {
    const shareButton = document.getElementById("share-button");

    const shareInput = document.createElement("input");
    shareInput.style.display = "none";
    shareInput.type = 'file';
    shareInput.accept = 'image/*,video/*';

    shareInput.addEventListener("change", async (e) => {
        console.log("=== share button pressed ===");

        console.log(e);
        console.log(e.target);
        console.log(e.target.files);

        const file = e.target.files[0];
        if (!file) return;

        let shareFileData = {
            files: [file],
            title: 'Share Recording',
            text: 'Check out my recording!'
        };

        if (navigator.canShare(shareFileData)) {
            await navigator.share(shareFileData).catch((error) => {
                console.error('Sharing failed:', error);
            });
        }
    });

    shareButton.addEventListener("click", async () => {
        try {
            // Trigger file selection dialog
            console.log("=== share clicked ===");
            shareInput.value = '';
            shareInput.click();
        } catch (error) {
            console.error('Error sharing media:', error);
            alert('Failed to share media. Please try again.');
        }
    });
}

function updateRenderSize() {

    let targetCanvas = global.renderTarget;
    let streamSource = global.mediaStreamSource;

    // Get the device pixel ratio
    const dpr = window.devicePixelRatio || 1;

    // Get the canvas display size
    // const rect = targetCanvas.getBoundingClientRect();

    // Set the canvas logical size
    const logicalWidth = window.innerWidth;
    const logicalHeight = window.innerHeight;

    if (targetCanvas) {
        // Set the canvas backing store size to match DPI
        targetCanvas.width = logicalWidth * dpr;
        targetCanvas.height = logicalHeight * dpr;

        // Set the display size to match the logical size
        targetCanvas.style.width = logicalWidth + 'px';
        targetCanvas.style.height = logicalHeight + 'px';

        // Scale the context to match the DPR
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
    }

    if (streamSource) {
        // Set the render size for the media stream source
        streamSource.setRenderSize(logicalWidth * dpr, logicalHeight * dpr);
    }
}

// sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

document.getElementById('btn-commencer').addEventListener("click", () => {
    console.log('start()');

    start();
});