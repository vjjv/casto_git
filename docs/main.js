(self["webpackChunkcamera_kit_demo"] = self["webpackChunkcamera_kit_demo"] || []).push([[792],{

/***/ 5458:
/***/ ((module) => {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = 5458;
module.exports = webpackEmptyContext;

/***/ }),

/***/ 6122:
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";

// EXTERNAL MODULE: ./node_modules/@snap/camera-kit/dist/index.js + 184 modules
var dist = __webpack_require__(431);
;// ./src/settings.js
/**
 * Camera Kit Web Demo Settings
 * Centralized configuration for the application
 */

const Settings = {
  // Camera settings
  camera: {
    fps: 25,
    constraints: {
      front: {
        video: {
          facingMode: { exact: "user" },
        },
        audio: true,
      },
      back: {
        video: {
          facingMode: { exact: "environment" },
        },
        audio: true,
      },
      desktop: {
        video: {
          facingMode: "user",
        },
        audio: true,
      },
    },
  },

  // Recording settings
  recording: {
    mimeType: "video/mp4",
    fps: 25,
    outputFileName: "Direction_Casto.mp4",
  },

  // FFmpeg settings
  ffmpeg: {
    baseURL: "/ffmpeg",
    coreURL: "ffmpeg-core.js",
    wasmURL: "ffmpeg-core.wasm",
    outputOptions: ["-movflags", "faststart", "-c", "copy"],
  },

  // UI settings
  ui: {
    recordButton: {
      startImage: "./assets/RecordButton.png",
      stopImage: "./assets/RecordStop.png",
    },
    assets: {
      poweredBySnap: "./assets/Powered_bysnap.png",
      recordOutline: "./assets/RecordOutline.png",
      shareButton: "./assets/ShareButton.png",
      downloadButton: "./assets/DownloadButton.png",
      backButton: "./assets/BackButton.png",
      loadingIcon: "./assets/LoadingIcon.png",
    },
  },
}

;// ./src/camera.js



class CameraManager {
  constructor() {
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    this.isBackFacing = false
    this.mediaStream = null
  }

  async initializeCamera() {
    if (!this.isMobile) {
      document.body.classList.add("desktop")
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia(this.getConstraints())
    return this.mediaStream
  }

  async updateCamera(session) {
    this.isBackFacing = !this.isBackFacing

    if (this.mediaStream) {
      session.pause()
      this.mediaStream.getTracks().forEach((track) => {
        track.stop()
      })
      this.mediaStream = null
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(this.getConstraints())
      const source = (0,dist/* createMediaStreamSource */.EU)(this.mediaStream, {
        cameraType: this.isBackFacing ? "environment" : "user",
        disableSourceAudio: false,
      })

      await session.setSource(source)
      if (!this.isBackFacing) {
        source.setTransform(dist/* Transform2D */.$Z.MirrorX)
      }
      await session.play()
      return source
    } catch (error) {
      console.error("Failed to get media stream:", error)
      throw error
    }
  }

  getConstraints() {
    return this.isMobile ? (this.isBackFacing ? Settings.camera.constraints.back : Settings.camera.constraints.front) : Settings.camera.constraints.desktop
  }
}

;// ./src/recorder.js


class MediaRecorderManager {
  constructor(videoProcessor, uiManager) {
    this.mediaRecorder = null
    this.recordedChunks = []
    this.videoProcessor = videoProcessor
    this.uiManager = uiManager
    this.audioVideoStream = null
    this.canvasStream = null
  }

  async startRecording(liveRenderTarget, constraints) {
    try {
      this.audioVideoStream = await navigator.mediaDevices.getUserMedia(constraints)
      const audioTrack = this.audioVideoStream.getAudioTracks()[0]
      this.canvasStream = liveRenderTarget.captureStream(Settings.recording.fps)
      this.canvasStream.addTrack(audioTrack)

      this.mediaRecorder = new MediaRecorder(this.canvasStream, {
        mimeType: Settings.recording.mimeType,
      })
      this.recordedChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        console.log("start record")
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = async () => {
        console.log("stop record")
        this.uiManager.showLoading(true)
        const blob = new Blob(this.recordedChunks, { type: Settings.recording.mimeType })
        const fixedBlob = await this.videoProcessor.fixVideoDuration(blob)
        const url = URL.createObjectURL(fixedBlob)
        this.uiManager.showLoading(false)
        this.uiManager.displayPostRecordButtons(url, fixedBlob)
      }

      this.mediaRecorder.start()
      return true
    } catch (error) {
      console.error("Error accessing media devices:", error)
      return false
    }
  }

  resetRecordingVariables() {
    this.mediaRecorder = null
    this.recordedChunks = []
    // Stop all tracks in the audio/video stream
    if (this.audioVideoStream) {
      this.audioVideoStream.getTracks().forEach((track) => {
        track.stop()
      })
      this.audioVideoStream = null
    }

    // Stop all tracks in the canvas stream
    if (this.canvasStream) {
      this.canvasStream.getTracks().forEach((track) => {
        track.stop()
      })
      this.canvasStream = null
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop()
    }
  }
}

;// ./src/ui.js


class UIManager {
  constructor() {
    this.recordButton = document.getElementById("record-button")
    this.recordOutline = document.getElementById("outline")
    this.actionButton = document.getElementById("action-buttons")
    this.switchButton = document.getElementById("switch-button")
    this.loadingIcon = document.getElementById("loading")
    this.backButtonContainer = document.getElementById("back-button-container")
    this.recordPressedCount = 0
  }

  toggleRecordButton(isVisible) {
    if (isVisible) {
      this.recordOutline.style.display = "block"
      this.recordButton.style.display = "block"
    } else {
      this.recordOutline.style.display = "none"
      this.recordButton.style.display = "none"
    }
  }

  updateRecordButtonState(isRecording) {
    this.recordButton.style.backgroundImage = isRecording ? `url('${Settings.ui.recordButton.stopImage}')` : `url('${Settings.ui.recordButton.startImage}')`
    this.recordPressedCount++
  }

  showLoading(show) {
    this.loadingIcon.style.display = show ? "block" : "none"
  }

  displayPostRecordButtons(url, fixedBlob) {
    this.actionButton.style.display = "block";
    this.backButtonContainer.style.display = "block";
    this.switchButton.style.display = "none";

    // Create or reuse the overlay element
    let overlay = document.getElementById("video-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "video-overlay";
      document.body.appendChild(overlay);
    }
    overlay.style.display = "block";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "rgba(0,0,0,0.9)";
    overlay.style.zIndex = "10";  // behind the video (zIndex 11)
    overlay.style.pointerEvents = "none";  // so clicks fall through if needed

    // Create or reuse the video preview element
    let videoPreview = document.getElementById("video-preview");
    if (!videoPreview) {
      videoPreview = document.createElement("video");
      videoPreview.id = "video-preview";
      videoPreview.controls = true;
      videoPreview.autoplay = false;
      videoPreview.muted = true;
      document.body.appendChild(videoPreview);
    }

    videoPreview.src = url;
    videoPreview.style.position = "fixed";
    videoPreview.style.right = "10px";
    videoPreview.style.top = "5%";
    videoPreview.style.width = "100vw";
    videoPreview.style.zIndex = "11";
    videoPreview.style.display = "block";
    videoPreview.style.backgroundColor = "#000";
    videoPreview.style.borderRadius = "8px";
    videoPreview.style.boxShadow = "0 2px 10px rgba(0,0,0,0.5)";
    videoPreview.style.height = "auto";



    document.getElementById("download-button").onclick = () => {
      const a = document.createElement("a");
      a.href = url;
      a.download = Settings.recording.outputFileName;
      a.click();
      a.remove();
    };

    document.getElementById("share-button").onclick = async () => {
      try {
        const file = new File([fixedBlob], Settings.recording.outputFileName, {
          type: Settings.recording.mimeType,
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Recorded Video",
            text: "Check out this recording!",
          });
          console.log("File shared successfully");
        } else {
          console.error("Sharing files is not supported on this device.");
        }
      } catch (error) {
        console.error("Error while sharing:", error);
      }
    };

    document.getElementById("back-button").onclick = async () => {
      this.actionButton.style.display = "none"
      this.backButtonContainer.style.display = "none"
      this.switchButton.style.display = "block"
      videoPreview.style.display = 'none';
      overlay.style.display = 'none';
      this.toggleRecordButton(true)
    }
  }

  // displayPostRecordButtons(url, fixedBlob) {
  //   this.actionButton.style.display = "block"
  //   this.backButtonContainer.style.display = "block"
  //   this.switchButton.style.display = "none"

  //   document.getElementById("download-button").onclick = () => {
  //     const a = document.createElement("a")
  //     a.href = url
  //     a.download = Settings.recording.outputFileName
  //     a.click()
  //     a.remove()
  //   }

  //   document.getElementById("share-button").onclick = async () => {
  //     try {
  //       const file = new File([fixedBlob], Settings.recording.outputFileName, {
  //         type: Settings.recording.mimeType,
  //       })

  //       if (navigator.canShare && navigator.canShare({ files: [file] })) {
  //         await navigator.share({
  //           files: [file],
  //           title: "Recorded Video",
  //           text: "Check out this recording!",
  //         })
  //         console.log("File shared successfully")
  //       } else {
  //         console.error("Sharing files is not supported on this device.")
  //       }
  //     } catch (error) {
  //       console.error("Error while sharing:", error)
  //     }
  //   }

  //   document.getElementById("back-button").onclick = async () => {
  //     this.actionButton.style.display = "none"
  //     this.backButtonContainer.style.display = "none"
  //     this.switchButton.style.display = "block"
  //     this.toggleRecordButton(true)
  //   }
  // }

  updateRenderSize(source, liveRenderTarget) {
    const width = window.innerWidth
    const height = window.innerHeight

    liveRenderTarget.style.width = `${width}px`
    liveRenderTarget.style.height = `${height}px`
    source.setRenderSize(width, height)
  }
}

// EXTERNAL MODULE: ./node_modules/@ffmpeg/ffmpeg/dist/esm/index.js + 3 modules
var esm = __webpack_require__(8502);
// EXTERNAL MODULE: ./node_modules/@ffmpeg/util/dist/esm/index.js + 1 modules
var dist_esm = __webpack_require__(8166);
;// ./src/videoProcessor.js




class VideoProcessor {
  constructor() {
    this.ffmpeg = new esm/* FFmpeg */.m()
  }

  async fixVideoDuration(blob) {
    try {
      console.log("Loading FFmpeg...")
      const { baseURL, coreURL, wasmURL, outputOptions } = Settings.ffmpeg

      const fullCoreURL = `${baseURL}/${coreURL}`
      const fullWasmURL = `${baseURL}/${wasmURL}`

      console.log("Loading FFmpeg with URLs:", {
        coreURL: fullCoreURL,
        wasmURL: fullWasmURL,
      })

      await this.ffmpeg.load({
        coreURL: fullCoreURL,
        wasmURL: fullWasmURL,
      })

      console.log("FFmpeg loaded successfully")

      await this.ffmpeg.writeFile("input.mp4", await (0,dist_esm/* fetchFile */.t2)(blob))
      await this.ffmpeg.exec(["-i", "input.mp4", ...outputOptions, "output.mp4"])
      const fixedData = await this.ffmpeg.readFile("output.mp4")
      return new Blob([fixedData.buffer], { type: Settings.recording.mimeType })
    } catch (error) {
      console.error("Error in fixVideoDuration:", error)
      throw error
    }
  }
}

;// ./src/main.js








 (async function () {

    let isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if(!isMobile){
      // document.getElementById('desktop').style.display = 'flex';
      // return; //baba to uncomment
      document.getElementById('desktop').style.display = 'none'; //baba to remove
    } else{
      document.getElementById('desktop').style.display = 'none';
    }

    async function start() {
      console.log('start()');
      canClickCanvas = true;
      document.getElementById('switch-button').style.display = 'block'

      // Get environment variables
      const apiToken = "eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzM4MjM2Njg5LCJzdWIiOiJmYWMzYWZjOS0zOTEyLTRlNTUtYTdiZS03MjJlOGRmYWY4ZjV-UFJPRFVDVElPTn5lOGQ0OTM1NS00YmNlLTRiYWEtODkzNC1lMWNlNmU0ZDM5M2IifQ.6sZB_6aFPL8OW-UO3Y37P7Rev7mzjS9IhNRFk7NelBI";
      // const lensID = "e6b3c3d0-1899-4e66-8a71-5acd4d16d66f"; //casto v1
      // const lensID = "13e6a7ad-3edf-4b2b-9f6b-8d089a18745b"; //casto v2
      const lensID = "c520fac0-a80c-4eac-b16d-e77682063ed3"; //casto v3
      const groupID = "f7f4e367-f4b3-4de5-8e81-e9c842f2bf0b";

      if (!apiToken || !lensID || !groupID) {
        console.error("Missing required environment variables. Please check your environment settings.")
        return
      }

      // Initialize managers
      const uiManager = new UIManager()
      const cameraManager = new CameraManager()
      const videoProcessor = new VideoProcessor()
      const mediaRecorder = new MediaRecorderManager(videoProcessor, uiManager)

      // Initialize Camera Kit
      const cameraKit = await (0,dist/* bootstrapCameraKit */.Y4)({
        apiToken: apiToken,
      })

      // Get canvas element for live render target
      const liveRenderTarget = document.getElementById("canvas")

      // Create camera kit session
      const session = await cameraKit.createSession({ liveRenderTarget })

      // Initialize camera and set up source
      const mediaStream = await cameraManager.initializeCamera()
      const source = (0,dist/* createMediaStreamSource */.EU)(mediaStream, {
        cameraType: "user",
        disableSourceAudio: false,
      })
      await session.setSource(source)
      source.setTransform(dist/* Transform2D */.$Z.MirrorX)
      const resolutionMultiplier = window.devicePixelRatio;
      const width = window.innerWidth * resolutionMultiplier;
      const height = window.innerHeight * resolutionMultiplier;
      await source.setRenderSize(width, height);
      // await source.setRenderSize(window.innerWidth, window.innerHeight)
      await session.setFPSLimit(Settings.camera.fps)
      await session.play()

      // Load and apply lens
      const lens = await cameraKit.lensRepository.loadLens(lensID, groupID)
      // await session.applyLens(lens)
      await session.applyLens(lens, { launchParams: { "prenom": window.prenom, "ville": window.ville } })

      // Set up event listeners
      uiManager.recordButton.addEventListener("click", async () => {
        if (canClickCanvas) {
          clickCanvasCapture();
          canClickCanvas = false;
        }
        if (uiManager.recordPressedCount % 2 === 0) {
          const success = await mediaRecorder.startRecording(liveRenderTarget, cameraManager.getConstraints())
          if (success) {
            uiManager.updateRecordButtonState(true)
          }
        } else {
          uiManager.updateRecordButtonState(false)
          uiManager.toggleRecordButton(false)
          mediaRecorder.stopRecording()
        }
      })

      uiManager.switchButton.addEventListener("click", async () => {
        try {
          const source = await cameraManager.updateCamera(session)
          uiManager.updateRenderSize(source, liveRenderTarget)
        } catch (error) {
          console.error("Error switching camera:", error)
        }
      })

      // Add back button handler
      document.getElementById("back-button").addEventListener("click", async () => {
        try {
          mediaRecorder.resetRecordingVariables()
          uiManager.updateRenderSize(source, liveRenderTarget)
        } catch (error) {
          console.error("Error resetting camera:", error)
        }
      })

      // Add window resize listener
      // window.addEventListener("resize", () => uiManager.updateRenderSize(source, liveRenderTarget))

      // Update initial render size
      // uiManager.updateRenderSize(source, liveRenderTarget)
    }

    let canClickCanvas = false;
    document.getElementById('btn-commencer').addEventListener("click", () => {
      start();
    });
    document.getElementById('back-button').addEventListener("click", () => {
      start();
    });
    // document.getElementById("back-button").onclick = async () => {
    //   start();
    // }

    function clickCanvasCapture(relX = 0.5, relY = 0.93) {
      const canvas = document.getElementById('canvas');
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

  })()


/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ __webpack_require__.O(0, [96], () => (__webpack_exec__(6122)));
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ }
]);