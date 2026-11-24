package br.com.eventify.app

import android.app.Application
import android.content.Context
import android.util.AtomicFile
import android.util.Log
import java.io.File
import java.io.IOException
import java.text.DateFormat
import java.util.Date

class EventifyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (getProcessName() != packageName) return
        val systemHandler = Thread.getDefaultUncaughtExceptionHandler() ?: return
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            try {
                StartupReport.record(this, "Falha no aplicativo", error)
            } finally {
                systemHandler.uncaughtException(thread, error)
            }
        }
    }
}

internal object StartupReport {
    private fun file(context: Context) = AtomicFile(File(context.filesDir, "startup-report.txt"))

    @Synchronized
    fun record(context: Context, stage: String, error: Throwable) {
        Log.w("Eventify", stage, error)
        val cause = generateSequence(error) { it.cause }.take(8).last()
        val location = cause.stackTrace.firstOrNull()
        val report = buildString {
            appendLine(DateFormat.getDateTimeInstance().format(Date()))
            appendLine(stage)
            appendLine(cause.javaClass.name)
            location?.let { append("${it.className}.${it.methodName} (linha ${it.lineNumber})") }
        }
        val reportFile = file(context)
        try {
            val stream = reportFile.startWrite()
            try {
                stream.write(report.toByteArray(Charsets.UTF_8))
                reportFile.finishWrite(stream)
            } catch (error: IOException) {
                reportFile.failWrite(stream)
                throw error
            }
        } catch (error: IOException) {
            Log.w("Eventify", "Falha ao gravar o diagnóstico", error)
        }
    }

    fun read(context: Context): String? = try {
        file(context).openRead().bufferedReader(Charsets.UTF_8).use { it.readText() }
    } catch (_: IOException) {
        null
    }
}
