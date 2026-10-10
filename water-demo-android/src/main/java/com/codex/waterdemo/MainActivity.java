package com.codex.waterdemo;

import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.graphics.Color;
import android.graphics.Rect;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Bundle;
import android.view.Surface;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedDispatcher;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONObject;

public final class MainActivity extends Activity implements SensorEventListener {
    private WebView web;
    private SensorManager sensors;
    private Sensor gravitySensor, skySensor;
    private boolean skyEnabled;
    private boolean skyRegistered, gravityRegistered;
    private volatile String latestSkyRotation = "";
    private android.location.LocationManager skyLocations;
    private android.location.LocationListener skyLocationListener;
    private final float[] skyRotation = new float[9];
    private boolean enabled, resumed, ready, initialized;
    private long lastFrame;
    private boolean backPending;
    private float lastKeyboardFraction = -1f;
    private final float[] filtered = new float[3];

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        sensors = (SensorManager) getSystemService(SENSOR_SERVICE);
        gravitySensor = sensors.getDefaultSensor(Sensor.TYPE_GRAVITY);
        if (gravitySensor == null) gravitySensor = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        skySensor = sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        if (skySensor == null) skySensor = sensors.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR);
        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setBlockNetworkLoads(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new SensorBridge(), "WaterSensors");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true; // The sensor bridge is exposed only to the bundled page.
            }
            @Override public void onPageFinished(WebView view, String url) {
                ready = true;
                lastKeyboardFraction = -1f;
                reportKeyboardViewport();
            }
        });
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        setContentView(web);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::returnToHome);
        }
        if (Build.VERSION.SDK_INT >= 30) {
            web.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                view.post(this::reportKeyboardViewport);
                return insets;
            });
        }
        web.getViewTreeObserver().addOnGlobalLayoutListener(this::reportKeyboardViewport);
        try (InputStream input = getAssets().open("index.html");
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int length;
            while ((length = input.read(buffer)) != -1) output.write(buffer, 0, length);
            web.loadDataWithBaseURL("https://water-demo.local/",
                new String(output.toByteArray(), StandardCharsets.UTF_8), "text/html", "UTF-8", null);
        } catch (Exception exception) {
            web.loadData("<p>Unable to load water demo.</p>", "text/html", "UTF-8");
        }
    }

    // Measure the keyboard without resizing the window or adding IME padding.
    // Send a fraction so the page can convert physical pixels to its CSS viewport.
    private void reportKeyboardViewport() {
        if (!ready || web.getHeight() <= 0) return;
        View root = web.getRootView();
        int[] rootLocation = new int[2], webLocation = new int[2];
        root.getLocationOnScreen(rootLocation);
        web.getLocationOnScreen(webLocation);
        float fraction = 1f;
        int keyboardTop = 0;
        boolean keyboardVisible = false;
        if (Build.VERSION.SDK_INT >= 30 && web.getRootWindowInsets() != null) {
            WindowInsets insets = web.getRootWindowInsets();
            keyboardVisible = insets.isVisible(WindowInsets.Type.ime());
            keyboardTop = rootLocation[1] + root.getHeight()
                    - insets.getInsets(WindowInsets.Type.ime()).bottom;
        } else {
            Rect visible = new Rect();
            root.getWindowVisibleDisplayFrame(visible);
            keyboardVisible = rootLocation[1] + root.getHeight() - visible.bottom
                    > 100 * getResources().getDisplayMetrics().density;
            keyboardTop = visible.bottom;
        }
        if (keyboardVisible) {
            int contentHeight = Math.max(1, web.getHeight() - web.getPaddingTop() - web.getPaddingBottom());
            fraction = Math.max(0f, Math.min(1f,
                    (keyboardTop - webLocation[1] - web.getPaddingTop()) / (float) contentHeight));
        }
        if (Math.abs(fraction - lastKeyboardFraction) < .001f) return;
        lastKeyboardFraction = fraction;
        web.evaluateJavascript("window.dispatchEvent(new CustomEvent('waterkeyboard',{detail:{visibleFraction:"
                + Float.toString(fraction) + "}}));", null);
    }

    public final class SensorBridge {
        @JavascriptInterface public String getAppVersion() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
            catch (Exception exception) { return "2.1.0"; }
        }
        @JavascriptInterface public boolean openReleaseUrl(String url) {
            Uri uri = Uri.parse(url);
            if (!"https".equals(uri.getScheme()) || !"github.com".equals(uri.getHost())
                    || uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)
                    || uri.getPath() == null || !(uri.getPath().equals("/cnjialin/budgetgauge/releases")
                    || uri.getPath().startsWith("/cnjialin/budgetgauge/releases/"))) return false;
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            runOnUiThread(() -> {
                try { startActivity(intent); }
                catch (ActivityNotFoundException exception) {
                    android.widget.Toast.makeText(MainActivity.this, "请安装浏览器后重试", android.widget.Toast.LENGTH_SHORT).show();
                }
            });
            return true;
        }
        @JavascriptInterface public void checkLatestRelease(String requestId) {
            if (requestId == null || !requestId.matches("[0-9]+")) return;
            new Thread(() -> {
                JSONObject result = new JSONObject();
                try {
                    result.put("requestId", requestId);
                    String[] urls = {
                        "https://api.github.com/repos/cnjialin/budgetgauge/releases/latest",
                        "https://raw.githubusercontent.com/cnjialin/budgetgauge/main/public/water-release.json"
                    };
                    Exception lastError = null;
                    for (String url : urls) {
                        try { result.put("release", new JSONObject(readRelease(url))); break; }
                        catch (Exception exception) { lastError = exception; }
                    }
                    if (!result.has("release")) {
                        String reason = lastError instanceof java.net.SocketTimeoutException ? "连接超时"
                            : lastError instanceof java.net.UnknownHostException ? "无法解析 GitHub 地址"
                            : lastError instanceof javax.net.ssl.SSLException ? "安全连接失败"
                            : lastError == null ? "网络不可用" : lastError.getMessage();
                        result.put("error", reason);
                    }
                } catch (Exception ignored) { return; }
                String payload = JSONObject.quote(result.toString());
                runOnUiThread(() -> {
                    if (!isFinishing() && !isDestroyed()) web.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('waterrelease',{detail:JSON.parse(" + payload + ")}));", null);
                });
            }, "water-release-check").start();
        }
        @JavascriptInterface public String getSkyRotation() { return latestSkyRotation; }
        @JavascriptInterface public boolean isSkyAvailable() { return skySensor != null; }
        @JavascriptInterface public void setSkyEnabled(boolean value) {
            runOnUiThread(() -> { skyEnabled = value; if (!value) stopSkyLocation(); updateSensors(); });
        }
        @JavascriptInterface public float getSkyDeclination(double latitude, double longitude) {
            return new android.hardware.GeomagneticField((float) latitude, (float) longitude, 0f, System.currentTimeMillis()).getDeclination();
        }
        @JavascriptInterface public void requestSkyLocation() { runOnUiThread(() -> {
            if (!skyEnabled || !resumed) return;
            if (checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.ACCESS_COARSE_LOCATION}, 42);
            } else locateSky();
        }); }
        @JavascriptInterface public boolean isAvailable() { return gravitySensor != null; }
        @JavascriptInterface public void setEnabled(boolean value) {
            runOnUiThread(() -> {
                enabled = value;
                updateSensors();
            });
        }
    }

    private String readRelease(String url) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(8000);
        connection.setRequestProperty("User-Agent", "Water-Android");
        connection.setRequestProperty("Accept", "application/json");
        try {
            int code = connection.getResponseCode();
            if (code != 200) throw new java.io.IOException(code == 403 || code == 429
                ? "GitHub 请求受限" : "服务器响应 " + code);
            try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    output.write(buffer, 0, count);
                    if (output.size() > 1048576) throw new java.io.IOException("版本数据过大");
                }
                return new String(output.toByteArray(), StandardCharsets.UTF_8);
            }
        } finally { connection.disconnect(); }
    }

    @Override public void onBackPressed() { returnToHome(); }

    private void returnToHome() {
        if (backPending) return;
        if (!ready) { moveTaskToBack(true); return; }
        backPending = true;
        web.evaluateJavascript("Boolean(window.waterBack && window.waterBack())", result -> {
            backPending = false;
            if (!"true".equals(result)) moveTaskToBack(true);
        });
    }

    private void updateSensors() {
        boolean wantSky = skyEnabled && resumed && skySensor != null;
        if (wantSky != skyRegistered) {
            if (wantSky) skyRegistered = sensors.registerListener(this, skySensor, 10000);
            else { sensors.unregisterListener(this, skySensor); skyRegistered = false; latestSkyRotation = ""; }
        }
        boolean wantGravity = enabled && resumed && gravitySensor != null;
        if (wantGravity != gravityRegistered) {
            initialized = false;
            lastFrame = 0;
            if (wantGravity) gravityRegistered = sensors.registerListener(this, gravitySensor, SensorManager.SENSOR_DELAY_GAME);
            else { sensors.unregisterListener(this, gravitySensor); gravityRegistered = false; }
        }
    }

    @Override public void onSensorChanged(SensorEvent event) {
        if (!ready || !resumed) return;
        if (event.sensor == skySensor) {
            if (!skyEnabled) return;
            SensorManager.getRotationMatrixFromVector(skyRotation, event.values);
            // The JS draw frame pulls this latest snapshot. No queued WebView messages.
            StringBuilder data = new StringBuilder("[");
            for (int i = 0; i < 9; i++) { if (i > 0) data.append(','); data.append(Float.toString(skyRotation[i])); }
            latestSkyRotation = data.append(']').toString();
            return;
        }
        if (!enabled) return;
        for (int i = 0; i < 3; i++) {
            float alpha = event.sensor.getType() == Sensor.TYPE_ACCELEROMETER && initialized ? .12f : 1f;
            filtered[i] += alpha * (event.values[i] - filtered[i]);
        }
        initialized = true;
        if (event.timestamp - lastFrame < 32_000_000L) return;
        lastFrame = event.timestamp;
        // Android reports support acceleration, opposite physical gravity.
        // Natural screen coordinates: x right, y down.
        float x = -filtered[0] / SensorManager.GRAVITY_EARTH;
        float y = filtered[1] / SensorManager.GRAVITY_EARTH;
        float sx = x, sy = y;
        int rotation = getWindowManager().getDefaultDisplay().getRotation();
        if (rotation == Surface.ROTATION_90) { sx = y; sy = -x; }
        else if (rotation == Surface.ROTATION_180) { sx = -x; sy = -y; }
        else if (rotation == Surface.ROTATION_270) { sx = -y; sy = x; }
        if (!Float.isFinite(sx) || !Float.isFinite(sy)) return;
        web.evaluateJavascript("window.dispatchEvent(new CustomEvent('watergravity',{detail:{x:"
            + Float.toString(sx) + ",y:" + Float.toString(sy) + "}}));", null);
    }

    private void stopSkyLocation() {
        if (skyLocations != null && skyLocationListener != null) skyLocations.removeUpdates(skyLocationListener);
        skyLocationListener = null;
    }
    private void skyLocationError() {
        if (ready && skyEnabled && resumed) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('waterskylocation',{detail:{error:true}}));", null);
    }
    private void locateSky() {
        if (!skyEnabled || !resumed) return;
        stopSkyLocation();
        skyLocations = (android.location.LocationManager) getSystemService(LOCATION_SERVICE);
        try {
            String provider = skyLocations.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER)
                ? android.location.LocationManager.NETWORK_PROVIDER : android.location.LocationManager.GPS_PROVIDER;
            if (!skyLocations.isProviderEnabled(provider)) { skyLocationError(); return; }
            skyLocationListener = new android.location.LocationListener() {
                @Override public void onLocationChanged(android.location.Location location) {
                    if (skyEnabled && resumed && ready) web.evaluateJavascript("window.dispatchEvent(new CustomEvent('waterskylocation',{detail:{lat:"
                        + location.getLatitude() + ",lon:" + location.getLongitude() + "}}));", null);
                    stopSkyLocation();
                }
                @Override public void onProviderDisabled(String provider) { stopSkyLocation(); skyLocationError(); }
                @Override public void onProviderEnabled(String provider) {}
                @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
            };
            skyLocations.requestLocationUpdates(provider, 1000, 0, skyLocationListener);
            final android.location.LocationListener request = skyLocationListener;
            web.postDelayed(() -> { if (skyLocationListener == request) { stopSkyLocation(); skyLocationError(); } }, 15000);
        } catch (Exception exception) { stopSkyLocation(); skyLocationError(); }
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == 42) {
            if (results.length > 0 && results[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) locateSky();
            else skyLocationError();
        }
    }

    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) {}
    @Override protected void onResume() {
        super.onResume();
        resumed = true;
        web.onResume();
        web.evaluateJavascript("window.dispatchEvent(new CustomEvent('waterforeground',{detail:{active:true}}));", null);
        updateSensors();
    }
    @Override protected void onPause() {
        resumed = false;
        stopSkyLocation();
        updateSensors();
        web.evaluateJavascript("window.dispatchEvent(new CustomEvent('waterforeground',{detail:{active:false}}));", null);
        web.onPause();
        super.onPause();
    }
    @Override protected void onDestroy() {
        stopSkyLocation();
        sensors.unregisterListener(this);
        web.removeJavascriptInterface("WaterSensors");
        web.destroy();
        super.onDestroy();
    }
}
