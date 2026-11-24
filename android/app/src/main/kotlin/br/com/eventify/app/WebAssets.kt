package br.com.eventify.app

import android.content.res.AssetManager
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream
import java.io.IOException

internal const val APP_ORIGIN = "https://appassets.androidplatform.net"

internal class WebAssets(private val assets: AssetManager) {
    private val staticFile = Regex(
        """^/(?:assets/[a-z0-9_-]+\.(?:png|jpg|woff2)|app\.js|(?:styles|mobile)\.css|manifest\.webmanifest|index\.html)$"""
    )
    private val contentTypes = mapOf(
        "html" to "text/html",
        "css" to "text/css",
        "js" to "text/javascript",
        "png" to "image/png",
        "jpg" to "image/jpeg",
        "woff2" to "font/woff2",
        "webmanifest" to "application/manifest+json"
    )
    private val headers = mapOf(
        "Cache-Control" to "no-store",
        "X-Content-Type-Options" to "nosniff",
        "Content-Security-Policy" to "default-src 'self'; img-src 'self' data:; style-src 'self'; " +
            "connect-src 'none'; frame-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    )

    fun isLocal(uri: Uri) = uri.scheme == "https" && uri.encodedAuthority == "appassets.androidplatform.net"

    fun respond(request: WebResourceRequest): WebResourceResponse {
        if (!isLocal(request.url)) return error(403, "Forbidden")
        if (request.method != "GET" && request.method != "HEAD") return error(405, "Method Not Allowed")

        val path = request.url.path.orEmpty()
        val file = when {
            path == "/" || path.isEmpty() -> "index.html"
            staticFile.matches(path) -> path.removePrefix("/")
            request.isForMainFrame && '.' !in path -> "index.html"
            else -> return error(404, "Not Found")
        }
        val type = contentTypes.getValue(file.substringAfterLast('.'))
        val charset = if (type.startsWith("text/") || type.endsWith("+json")) "UTF-8" else null
        val body = try {
            assets.open("web/$file").let { input ->
                if (request.method == "GET") input else {
                    input.close()
                    ByteArrayInputStream(byteArrayOf())
                }
            }
        } catch (_: IOException) {
            return error(404, "Not Found")
        }
        return WebResourceResponse(type, charset, 200, "OK", headers, body)
    }

    private fun error(status: Int, reason: String): WebResourceResponse =
        WebResourceResponse("text/plain", "UTF-8", status, reason, headers, ByteArrayInputStream(byteArrayOf()))
}
