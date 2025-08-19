import { Settings } from "./settings"

export class UIManager {
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
    // this.backButtonContainer.style.display = "block";
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
    // videoPreview.style.right = "10px";
    videoPreview.style.top = "0%";
    videoPreview.style.width = "100vw";
    videoPreview.style.zIndex = "11";
    videoPreview.style.display = "block";
    videoPreview.style.backgroundColor = "#000";
    // videoPreview.style.borderRadius = "8px";
    // videoPreview.style.boxShadow = "0 2px 10px rgba(0,0,0,0.5)";
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
