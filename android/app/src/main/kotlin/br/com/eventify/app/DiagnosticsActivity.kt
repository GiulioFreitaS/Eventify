package br.com.eventify.app

import android.app.Activity
import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.text.DateFormat
import java.util.Date

class DiagnosticsActivity : Activity() {
    @Suppress("DEPRECATION")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val spacing = (24 * resources.displayMetrics.density).toInt()
        val version = packageManager.getPackageInfo(packageName, 0).versionName
        val exit = readLastUnexpectedExit()
        val report = StartupReport.read(this)
        val details = buildString {
            appendLine("Eventify $version")
            appendLine("Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
            exit?.let { append("\n$it\n") }
            report?.let { append("\nÚltima exceção registrada\n$it\n") }
            if (exit == null && report == null) append("\nTente abrir a Eventify e consulte o diagnóstico novamente.")
        }
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(spacing, spacing, spacing, spacing)
            addView(TextView(this@DiagnosticsActivity).apply {
                text = "Diagnóstico da Eventify"
                textSize = 24f
                isAccessibilityHeading = true
            })
            addView(TextView(this@DiagnosticsActivity).apply {
                text = details
                textSize = 16f
                setTextIsSelectable(true)
                setPadding(0, spacing / 2, 0, spacing)
            })
            addView(Button(this@DiagnosticsActivity).apply {
                text = "Fechar diagnóstico"
                setOnClickListener { finish() }
            })
        }
        setContentView(ScrollView(this).apply {
            fitsSystemWindows = true
            addView(panel)
        })
    }

    private fun readLastUnexpectedExit(): String? {
        if (Build.VERSION.SDK_INT < 30) return null
        val activityManager = getSystemService(ActivityManager::class.java) ?: return null
        val history = try {
            activityManager.getHistoricalProcessExitReasons(packageName, 0, 12)
        } catch (_: RuntimeException) {
            return null
        }
        return history.firstNotNullOfOrNull { exit ->
            if (exit.processName != packageName) return@firstNotNullOfOrNull null
            val reason = when (exit.reason) {
                ApplicationExitInfo.REASON_CRASH -> "Exceção no aplicativo"
                ApplicationExitInfo.REASON_CRASH_NATIVE -> "Falha em código nativo"
                ApplicationExitInfo.REASON_INITIALIZATION_FAILURE -> "Falha na inicialização do processo"
                ApplicationExitInfo.REASON_ANR -> "Aplicativo parou de responder"
                ApplicationExitInfo.REASON_LOW_MEMORY -> "Processo encerrado por falta de memória"
                ApplicationExitInfo.REASON_DEPENDENCY_DIED -> "Um processo de apoio foi interrompido"
                ApplicationExitInfo.REASON_SIGNALED -> "Processo interrompido por sinal"
                else -> return@firstNotNullOfOrNull null
            }
            val date = DateFormat.getDateTimeInstance().format(Date(exit.timestamp))
            "$date\n$reason\nCódigo Android: ${exit.reason} · Status: ${exit.status}"
        }
    }
}
