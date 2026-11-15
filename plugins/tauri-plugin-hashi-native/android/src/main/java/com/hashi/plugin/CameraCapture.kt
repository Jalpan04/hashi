package com.hashi.plugin

import android.app.Activity
import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CameraCapture(
    private val activity: Activity,
    private val context: Context
) {
    private var imageCapture: ImageCapture? = null
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    fun takePhotoToPrivateStorage(
        onSuccess: (String, Long) -> Unit,
        onError: (String) -> Unit
    ) {
        val imageCapture = this.imageCapture ?: run {
            onError("Camera is not initialized")
            return
        }

        // Save directly to private app internal storage, never the gallery
        val mediaDir = File(context.filesDir, "meals")
        if (!mediaDir.exists()) {
            mediaDir.mkdirs()
        }

        val photoFile = File(
            mediaDir,
            SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(System.currentTimeMillis()) + ".jpg"
        )

        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    onSuccess(photoFile.absolutePath, photoFile.length())
                }

                override fun onError(exc: ImageCaptureException) {
                    onError(exc.message ?: "Failed to capture photo")
                }
            }
        )
    }

    fun shutdown() {
        cameraExecutor.shutdown()
    }
}
