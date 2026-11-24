package br.com.eventify.app

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import android.window.OnBackInvokedDispatcher
import java.io.File
import java.io.IOException
import kotlin.concurrent.thread

class MainActivity : Activity() {
    private lateinit var content: FrameLayout
    private var webView: WebView? = null
    private var pageReady = false
    private val startupTimeout = Runnable {
        showFailure("EVT-TEMPO", "O aplicativo demorou para carregar. Tente novamente.")
    }
    private var pendingExport: File? = null
    private val exportDirectory get() = File(cacheDir, "exports")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        content = FrameLayout(this).apply { setBackgroundColor(PAPER) }
        setContentView(content)

        setupWindow("Ajuste das barras do sistema") { configureInsets(content) }
        if (Build.VERSION.SDK_INT >= 33) {
            setupWindow("Botão Voltar do Android") {
                onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) {
                    goBack()
                }
            }
        }
        savedInstanceState?.getString("pendingExport")?.let { filename ->
            if (Regex("""eventify-[0-9]+\.tmp""").matches(filename)) {
                pendingExport = File(exportDirectory, filename).takeIf(File::isFile)
            }
        }
        content.post { if (!isFinishing && !isDestroyed) openApp(savedInstanceState) }
    }

    private inline fun setupWindow(stage: String, configure: () -> Unit) {
        try {
            configure()
        } catch (error: RuntimeException) {
            StartupReport.record(this, stage, error)
        } catch (error: LinkageError) {
            StartupReport.record(this, stage, error)
        }
    }

    private fun openApp(savedState: Bundle? = null) {
        content.removeAllViews()
        try {
            val view = WebView(this)
            webView = view
            view.setBackgroundColor(PAPER)
            view.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                useWideViewPort = true
                allowFileAccess = false
                allowContentAccess = false
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            }
            view.webViewClient = LocalClient(WebAssets(assets))
            view.addJavascriptInterface(AndroidBridge(view), "EventifyAndroid")
            content.addView(view, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            awaitPage()
            if (savedState == null || view.restoreState(savedState) == null) view.loadUrl("$APP_ORIGIN/")
        } catch (error: RuntimeException) {
            showWebViewUnavailable(error)
        } catch (error: LinkageError) {
            showWebViewUnavailable(error)
        }
    }

    private fun awaitPage() {
        pageReady = false
        content.removeCallbacks(startupTimeout)
        content.postDelayed(startupTimeout, 15_000)
    }

    private inner class LocalClient(private val loader: WebAssets) : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse =
            loader.respond(request)

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
            !loader.isLocal(request.url)

        override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
            if (webView === view) awaitPage()
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            reportLoadFailure(view, request, error.errorCode)
        }

        override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, error: WebResourceResponse) {
            reportLoadFailure(view, request, error.statusCode)
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            if (webView === view) {
                Log.w(TAG, "WebView encerrado. didCrash=${detail.didCrash()}")
                showFailure("EVT-RENDER", "O Android interrompeu o carregamento da Eventify.")
            }
            return true
        }
    }

    private fun reportLoadFailure(view: WebView, request: WebResourceRequest, status: Int) {
        val appScript = request.url.path == "/app.js"
        if (!request.isForMainFrame && !appScript) return
        content.post {
            if (webView === view && (request.isForMainFrame || !pageReady)) {
                Log.w(TAG, "Falha no recurso de inicialização. status=$status")
                showFailure("EVT-ARQUIVO", "Não foi possível carregar os arquivos do aplicativo.")
            }
        }
    }

    private fun showWebViewUnavailable(error: Throwable) {
        StartupReport.record(this, "Falha ao iniciar o WebView", error)
        showFailure("EVT-WEBVIEW", "Atualize o Android System WebView ou o Chrome na Play Store e tente novamente.")
    }

    private fun showFailure(code: String, message: String) {
        Log.w(TAG, code)
        releaseWebView()
        if (isFinishing || isDestroyed) return
        val spacing = (24 * resources.displayMetrics.density).toInt()
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(spacing, spacing, spacing, spacing)
            addView(TextView(this@MainActivity).apply {
                text = "Não foi possível abrir a Eventify"
                textSize = 24f
                gravity = Gravity.CENTER
                isAccessibilityHeading = true
            })
            addView(TextView(this@MainActivity).apply {
                text = "$message\n\nCódigo: $code"
                textSize = 16f
                gravity = Gravity.CENTER
                setPadding(0, spacing / 2, 0, spacing)
            })
            addView(Button(this@MainActivity).apply {
                text = "Tentar novamente"
                setOnClickListener { openApp() }
            })
            addView(Button(this@MainActivity).apply {
                text = "Abrir diagnóstico"
                setOnClickListener { startActivity(Intent(this@MainActivity, DiagnosticsActivity::class.java)) }
            })
        }
        content.addView(panel, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
    }

    @Suppress("DEPRECATION")
    private fun configureInsets(content: FrameLayout) {
        if (Build.VERSION.SDK_INT < 30) return
        val appearance = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
        window.insetsController?.setSystemBarsAppearance(appearance, appearance)
        content.setOnApplyWindowInsetsListener { view, insets ->
            val edges = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout() or WindowInsets.Type.ime())
            view.setPadding(edges.left, edges.top, edges.right, edges.bottom)
            WindowInsets.CONSUMED
        }
        window.setDecorFitsSystemWindows(false)
    }

    private fun goBack() {
        val view = webView
        if (view != null && view.canGoBack()) view.goBack() else finish()
    }

    @Deprecated("Fallback for Android versions before API 33")
    override fun onBackPressed() = goBack()

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView?.saveState(outState)
        outState.putString("pendingExport", pendingExport?.name)
    }

    override fun onDestroy() {
        if (::content.isInitialized) releaseWebView()
        super.onDestroy()
    }

    private fun releaseWebView() {
        content.removeCallbacks(startupTimeout)
        val view = webView ?: return
        webView = null
        content.removeView(view)
        view.destroy()
    }

    private inner class AndroidBridge(private val view: WebView) {
        @JavascriptInterface
        fun pageReady() = runOnUiThread {
            if (webView === view) {
                pageReady = true
                content.removeCallbacks(startupTimeout)
            }
        }

        @JavascriptInterface
        fun pageFailed() = runOnUiThread {
            if (webView === view && !pageReady) {
                showFailure("EVT-INICIO", "A interface da Eventify não conseguiu iniciar.")
            }
        }

        @JavascriptInterface
        fun saveDocument(name: String, mimeType: String, dataUrl: String) {
            val validDocument = when (mimeType) {
                "image/png" -> Regex("""Eventify-[A-Z0-9-]+\.png""").matches(name)
                "text/csv" -> name == "eventify-participantes.csv"
                else -> false
            }
            val prefix = "data:$mimeType"
            val comma = dataUrl.indexOf(',')
            if (!validDocument || name.length > 100 || dataUrl.length > 12_000_000 ||
                comma !in 1..100 || !dataUrl.startsWith(prefix) || !dataUrl.substring(0, comma).endsWith(";base64")) return

            val bytes = try {
                Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT)
            } catch (_: IllegalArgumentException) {
                runOnUiThread { showMessage("Não foi possível preparar o arquivo.") }
                return
            }
            runOnUiThread { if (webView === view) chooseExportLocation(name, mimeType, bytes) }
        }
    }

    @Suppress("DEPRECATION")
    private fun chooseExportLocation(name: String, mimeType: String, bytes: ByteArray) {
        if (isFinishing || isDestroyed || pendingExport != null) return
        try {
            exportDirectory.mkdirs()
            val stagedFile = File.createTempFile("eventify-", ".tmp", exportDirectory)
            pendingExport = stagedFile
            stagedFile.writeBytes(bytes)
            val picker = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = mimeType
                putExtra(Intent.EXTRA_TITLE, name)
            }
            startActivityForResult(picker, SAVE_DOCUMENT)
        } catch (_: IOException) {
            discardExport()
            showMessage("Não foi possível preparar o arquivo.")
        } catch (_: ActivityNotFoundException) {
            discardExport()
            showMessage("O seletor de arquivos do Android está indisponível.")
        }
    }

    @Deprecated("Result from the platform document picker")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != SAVE_DOCUMENT) return
        val file = pendingExport ?: return
        pendingExport = null
        val destination = data?.data
        if (resultCode != RESULT_OK || destination == null) {
            file.delete()
            return
        }
        thread {
            val message = try {
                val output = contentResolver.openOutputStream(destination, "w") ?: throw IOException()
                output.use { target -> file.inputStream().use { it.copyTo(target) } }
                "Arquivo salvo."
            } catch (_: IOException) {
                "Não foi possível salvar o arquivo."
            } catch (_: SecurityException) {
                "Não foi possível salvar nesta pasta."
            } finally {
                file.delete()
            }
            runOnUiThread { showMessage(message) }
        }
    }

    private fun discardExport() {
        pendingExport?.delete()
        pendingExport = null
    }

    private fun showMessage(message: String) =
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()

    private companion object {
        const val TAG = "Eventify"
        const val SAVE_DOCUMENT = 1
        val PAPER = Color.rgb(247, 236, 223)
    }
}
