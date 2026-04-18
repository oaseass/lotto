package com.sajulotto1.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;
import com.journeyapps.barcodescanner.CaptureActivity;

public class NativeQrScanActivity extends Activity {
    private static final int REQUEST_CAMERA_PERMISSION = 2001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (hasCameraPermission()) {
            launchScanner();
            return;
        }

        ActivityCompat.requestPermissions(
                this,
                new String[]{Manifest.permission.CAMERA},
                REQUEST_CAMERA_PERMISSION
        );
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        IntentResult result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data);
        if (result != null) {
            if (result.getContents() != null && !result.getContents().isEmpty()) {
                returnToWeb(result.getContents(), null);
            } else {
                returnToWeb(null, "scan-canceled");
            }
            return;
        }

        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode != REQUEST_CAMERA_PERMISSION) {
            return;
        }

        boolean granted = grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED;

        if (granted) {
            launchScanner();
            return;
        }

        returnToWeb(null, "permission-denied");
    }

    private boolean hasCameraPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }

        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void launchScanner() {
        IntentIntegrator integrator = new IntentIntegrator(this);
        integrator.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE);
        integrator.setPrompt("로또 용지 QR코드를 맞춰주세요");
        integrator.setBeepEnabled(false);
        integrator.setOrientationLocked(true);
        integrator.setCaptureActivity(CaptureActivity.class);
        integrator.initiateScan();
    }

    private void returnToWeb(String qrData, String nativeScanError) {
        Uri.Builder builder = new Uri.Builder()
                .scheme("https")
                .authority("lotto-two-dun.vercel.app")
                .appendPath("check");

        if (qrData != null && !qrData.isEmpty()) {
            builder.appendQueryParameter("qrData", qrData);
            builder.appendQueryParameter("nativeScan", "1");
        }

        if (nativeScanError != null && !nativeScanError.isEmpty()) {
            builder.appendQueryParameter("nativeScanError", nativeScanError);
        }

        Intent intent = new Intent(this, LauncherActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(builder.build());
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }
}