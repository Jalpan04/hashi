package com.hashi.plugin

import android.app.Activity
import android.content.Context

class HashiNativePlugin(
    private val activity: Activity,
    private val context: Context
) {
    val cameraCapture = CameraCapture(activity, context)
    val healthConnectReader = HealthConnectReader(context)
    val audioRecorder = AudioRecorder(context)
}
