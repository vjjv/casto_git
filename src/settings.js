const settings = {
    recordVideoFrameRate: 30,
    recordVideoBitsPerSecond: 3000000,
    recordAudioBitsPerSecond: 128000,

    recordedFileName: 'recording',
    snapshotFileName: 'snapshot',

    recordMicrophoneAudio: true,
    recordLensAudio: true,
    processVideoWithFFmpeg: false,

    recodeVideoCodecs: [
        // {
        //     codecString: 'video/webm;codecs=vp9',
        //     container: 'mp4',
        // },
        // {
        //     codecString: 'video/webm',
        //     container: 'webm',
        // },
        {
            codecString: 'video/mp4',
            container: 'mp4',
        }
    ],

    defaultCameraType: 'FRONT', // 'BACK' or 'FRONT'
    showDebugLog: true
}

export default settings;