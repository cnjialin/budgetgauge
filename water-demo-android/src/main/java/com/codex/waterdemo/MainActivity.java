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

public final class MainActivity extends Activity implements SensorEventListener {
    private WebView web;
    private SensorManager sensors;
    private Sensor gravitySensor;
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
            catch (Exception exception) { return "2.0.0"; }
        }
        @JavascriptInterface public boolean openReleaseUrl(String url) {
            Uri uri = Uri.parse(url);
            if (!"https".equals(uri.getScheme()) || !"github.com".equals(uri.getHost())
                    || uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)
                    || uri.getPath() == null || !(uri.getPath().equals("/cnjialin/budgetgauge/releases")
                    || uri.getPath().startsWith("/cnjialin/budgetgauge/releases/"))) return false;
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            if (intent.resolveActivity(getPackageManager()) == null) return false;
            runOnUiThread(() -> {
                try { startActivity(intent); }
                catch (ActivityNotFoundException exception) {
                    android.widget.Toast.makeText(MainActivity.this, "请安装浏览器后重试", android.widget.Toast.LENGTH_SHORT).show();
                }
            });
            return true;
        }
        @JavascriptInterface public boolean isAvailable() { return gravitySensor != null; }
        @JavascriptInterface public void setEnabled(boolean value) {
            runOnUiThread(() -> {
                enabled = value;
                updateSensors();
            });
        }
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
        sensors.unregisterListener(this);
        initialized = false;
        lastFrame = 0;
        if (enabled && resumed && gravitySensor != null) {
            sensors.registerListener(this, gravitySensor, SensorManager.SENSOR_DELAY_GAME);
        }
    }

    @Override public void onSensorChanged(SensorEvent event) {
        if (!ready || !enabled || !resumed) return;
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
        sensors.unregisterListener(this);
        web.evaluateJavascript("window.dispatchEvent(new CustomEvent('waterforeground',{detail:{active:false}}));", null);
        web.onPause();
        super.onPause();
    }
    @Override protected void onDestroy() {
        sensors.unregisterListener(this);
        web.removeJavascriptInterface("WaterSensors");
        web.destroy();
        super.onDestroy();
    }
}
