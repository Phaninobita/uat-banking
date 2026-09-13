package com.gringotts.banking;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private SwipeRefreshLayout swipeRefreshLayout;
    private ValueCallback<Uri[]> fileUploadCallback;

    // Default Gateway URL for Android Emulator (10.0.2.2 maps to host machine's localhost:3000)
    // On physical devices, this can also point to host IP or live API endpoint
    private static final String DEFAULT_GATEWAY_URL = "http://10.0.2.2:3000";

    // Activity Result Launcher for Document Vault KYC Uploads
    private final ActivityResultLauncher<Intent> filePickerLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (fileUploadCallback == null) return;
                Uri[] results = null;
                if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                    Intent data = result.getData();
                    if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                    } else if (data.getClipData() != null) {
                        ClipData clipData = data.getClipData();
                        int count = clipData.getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = clipData.getItemAt(i).getUri();
                        }
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
    );

    @Override
    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.bankingWebView);
        progressBar = findViewById(R.id.webViewProgressBar);
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout);

        // Hardware acceleration
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // Configure WebSettings for full modern web compatibility
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // Add JavaScript Interface Bridge
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        // WebChromeClient handles file chooser (KYC uploads), progress bar, alerts
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    filePickerLauncher.launch(intent);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    Toast.makeText(MainActivity.this, "Cannot open file picker: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        // WebViewClient keeps navigation inside WebView and handles errors
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("tel".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme)) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                    return true;
                }
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                swipeRefreshLayout.setRefreshing(false);
                // Inject base URL and Android environment flag
                injectAndroidEnvironment();
            }
        });

        // Swipe-to-refresh: disabled by default during forms, but can be pulled to reload
        swipeRefreshLayout.setColorSchemeResources(R.color.brand_primary, R.color.brand_gold);
        swipeRefreshLayout.setProgressBackgroundColorSchemeResource(R.color.surface_dark);
        swipeRefreshLayout.setOnRefreshListener(() -> webView.reload());
        swipeRefreshLayout.setEnabled(false); // keep stable during multistep forms

        // Handle Back button
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // Ask web page if it has an active modal or step to back out of
                    webView.evaluateJavascript("if (typeof handleAndroidBack === 'function') { handleAndroidBack(); } else { 'EXIT'; }", value -> {
                        if ("\"EXIT\"".equals(value) || "EXIT".equals(value)) {
                            finish();
                        }
                    });
                }
            }
        });

        requestPermissionsIfRequired();

        // Load the bundled Customer Portal local assets
        webView.loadUrl("file:///android_asset/public/index.html");
    }

    private void injectAndroidEnvironment() {
        String js = "window.IS_ANDROID_APP = true; " +
                    "window.API_BASE_URL = '" + DEFAULT_GATEWAY_URL + "'; " +
                    "if (typeof initAndroidBridge === 'function') { initAndroidBridge('" + DEFAULT_GATEWAY_URL + "'); }";
        webView.evaluateJavascript(js, null);
    }

    private void requestPermissionsIfRequired() {
        List<String> neededPermissions = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            neededPermissions.add(android.Manifest.permission.CAMERA);
        }
        if (!neededPermissions.isEmpty()) {
            ActivityCompat.requestPermissions(this, neededPermissions.toArray(new String[0]), 101);
        }
    }

    /**
     * Native JavaScript Interface exposed to the web frontend as `window.AndroidBridge`
     */
    public class AndroidBridge {

        @JavascriptInterface
        public void showToast(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void triggerHaptic() {
            runOnUiThread(() -> {
                Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (vibrator != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createOneShot(35, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        vibrator.vibrate(35);
                    }
                }
            });
        }

        @JavascriptInterface
        public String getGatewayUrl() {
            return DEFAULT_GATEWAY_URL;
        }

        @JavascriptInterface
        public void setGatewayUrl(String customUrl) {
            if (customUrl != null && !customUrl.trim().isEmpty()) {
                runOnUiThread(() -> {
                    String cleanUrl = customUrl.trim();
                    webView.evaluateJavascript("window.API_BASE_URL = '" + cleanUrl + "';", null);
                    Toast.makeText(MainActivity.this, "API Gateway set to: " + cleanUrl, Toast.LENGTH_SHORT).show();
                });
            }
        }
    }
}
