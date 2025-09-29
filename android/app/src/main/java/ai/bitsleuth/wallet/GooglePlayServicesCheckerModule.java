package ai.bitsleuth.wallet;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;

public class GooglePlayServicesCheckerModule extends ReactContextBaseJavaModule {
    private static final int PLAY_SERVICES_RESOLUTION_REQUEST = 9000;
    private static final String TAG = "GooglePlayServicesChecker";

    public GooglePlayServicesCheckerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "GooglePlayServicesChecker";
    }

    @ReactMethod
    public void checkPlayServices(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            GoogleApiAvailability googleApiAvailability = GoogleApiAvailability.getInstance();
            int resultCode = googleApiAvailability.isGooglePlayServicesAvailable(context);

            WritableMap result = Arguments.createMap();
            
            switch (resultCode) {
                case ConnectionResult.SUCCESS:
                    result.putBoolean("isAvailable", true);
                    result.putString("status", "SUCCESS");
                    result.putString("message", "Google Play Services is available and up to date");
                    break;
                case ConnectionResult.SERVICE_MISSING:
                    result.putBoolean("isAvailable", false);
                    result.putString("status", "SERVICE_MISSING");
                    result.putString("message", "Google Play Services is missing on this device");
                    break;
                case ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED:
                    result.putBoolean("isAvailable", false);
                    result.putString("status", "VERSION_UPDATE_REQUIRED");
                    result.putString("message", "Google Play Services needs to be updated");
                    break;
                case ConnectionResult.SERVICE_DISABLED:
                    result.putBoolean("isAvailable", false);
                    result.putString("status", "SERVICE_DISABLED");
                    result.putString("message", "Google Play Services is disabled");
                    break;
                case ConnectionResult.SERVICE_INVALID:
                    result.putBoolean("isAvailable", false);
                    result.putString("status", "SERVICE_INVALID");
                    result.putString("message", "Google Play Services is invalid");
                    break;
                default:
                    result.putBoolean("isAvailable", false);
                    result.putString("status", "UNKNOWN_ERROR");
                    result.putString("message", "Unknown error with Google Play Services");
                    break;
            }

            result.putInt("resultCode", resultCode);
            result.putBoolean("isUserResolvable", googleApiAvailability.isUserResolvableError(resultCode));
            
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("GOOGLE_PLAY_SERVICES_ERROR", "Failed to check Google Play Services", e);
        }
    }

    @ReactMethod
    public void showErrorDialog(Promise promise) {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "No current activity available");
                return;
            }

            Context context = getReactApplicationContext();
            GoogleApiAvailability googleApiAvailability = GoogleApiAvailability.getInstance();
            int resultCode = googleApiAvailability.isGooglePlayServicesAvailable(context);

            if (googleApiAvailability.isUserResolvableError(resultCode)) {
                Dialog errorDialog = googleApiAvailability.getErrorDialog(
                    currentActivity,
                    resultCode,
                    PLAY_SERVICES_RESOLUTION_REQUEST
                );
                
                if (errorDialog != null) {
                    errorDialog.show();
                    promise.resolve(true);
                } else {
                    promise.resolve(false);
                }
            } else {
                promise.resolve(false);
            }
        } catch (Exception e) {
            promise.reject("SHOW_ERROR_DIALOG_ERROR", "Failed to show error dialog", e);
        }
    }
}
