/**
 * Camera Kit Web Demo with Recording Feature
 * Created by gowaaa (https://www.gowaaa.com)
 * A creative technology studio specializing in AR experiences
 *
 * @copyright 2025 GOWAAA
 */

import { bootstrapCameraKit, createMediaStreamSource, Transform2D } from "@snap/camera-kit"
import "./styles/index.v3.css"
import { CameraManager } from "./camera"
import { MediaRecorderManager } from "./recorder"
import { UIManager } from "./ui"
import { VideoProcessor } from "./videoProcessor"
import { Settings } from "./settings"
  ; (async function () {

    async function start() {
      console.log('start()');
      canClickCanvas = true;
      document.getElementById('switch-button').style.display = 'block'

      // Get environment variables
      const apiToken = "eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzM4MjM2Njg5LCJzdWIiOiJmYWMzYWZjOS0zOTEyLTRlNTUtYTdiZS03MjJlOGRmYWY4ZjV-UFJPRFVDVElPTn5lOGQ0OTM1NS00YmNlLTRiYWEtODkzNC1lMWNlNmU0ZDM5M2IifQ.6sZB_6aFPL8OW-UO3Y37P7Rev7mzjS9IhNRFk7NelBI";
      // const lensID = "e6b3c3d0-1899-4e66-8a71-5acd4d16d66f"; //casto v1
      const lensID = "13e6a7ad-3edf-4b2b-9f6b-8d089a18745b"; //casto v2
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
      const cameraKit = await bootstrapCameraKit({
        apiToken: apiToken,
      })

      // Get canvas element for live render target
      const liveRenderTarget = document.getElementById("canvas")

      // Create camera kit session
      const session = await cameraKit.createSession({ liveRenderTarget })

      // Initialize camera and set up source
      const mediaStream = await cameraManager.initializeCamera()
      const source = createMediaStreamSource(mediaStream, {
        cameraType: "user",
        disableSourceAudio: false,
      })
      await session.setSource(source)
      source.setTransform(Transform2D.MirrorX)
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
