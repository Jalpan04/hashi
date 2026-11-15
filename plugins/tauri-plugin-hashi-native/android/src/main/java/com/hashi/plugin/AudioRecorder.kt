package com.hashi.plugin

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File

class AudioRecorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    private var currentFile: File? = null

    fun startRecording(onSuccess: (String) -> Unit, onError: (String) -> Unit) {
        try {
            val audioDir = File(context.filesDir, "audio")
            if (!audioDir.exists()) {
                audioDir.mkdirs()
            }

            val file = File(audioDir, "journal_${System.currentTimeMillis()}.opus")
            currentFile = file

            recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.OGG)
                setAudioEncoder(MediaRecorder.AudioEncoder.OPUS)
                setAudioEncodingBitRate(32000)
                setAudioSamplingRate(48000)
                setOutputFile(file.absolutePath)
                prepare()
                start()
            }
            onSuccess(file.absolutePath)
        } catch (e: Exception) {
            onError(e.message ?: "Failed to start audio recording")
        }
    }

    fun stopRecording(onSuccess: (String, Long) -> Unit, onError: (String) -> Unit) {
        try {
            recorder?.apply {
                stop()
                release()
            }
            recorder = null
            val file = currentFile
            if (file != null && file.exists()) {
                onSuccess(file.absolutePath, file.length())
            } else {
                onError("Recorded file does not exist")
            }
        } catch (e: Exception) {
            onError(e.message ?: "Failed to stop recording")
        }
    }
}
