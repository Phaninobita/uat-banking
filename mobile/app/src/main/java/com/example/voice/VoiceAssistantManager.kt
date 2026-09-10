package com.example.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.util.Log
import com.example.ui.BankViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

class VoiceAssistantManager(
    private val context: Context,
    private val viewModel: BankViewModel
) {
    private val tag = "VoiceAssistant"

    private var speechRecognizer: SpeechRecognizer? = null
    private var textToSpeech: TextToSpeech? = null
    private var isTtsReady = false

    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening.asStateFlow()

    private val _lastRecognizedText = MutableStateFlow("")
    val lastRecognizedText: StateFlow<String> = _lastRecognizedText.asStateFlow()

    private val _lastFeedback = MutableStateFlow<String?>(null)
    val lastFeedback: StateFlow<String?> = _lastFeedback.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    init {
        initTts()
    }

    private fun initTts() {
        try {
            textToSpeech = TextToSpeech(context) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    val result = textToSpeech?.setLanguage(Locale.US)
                    isTtsReady = (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED)
                }
            }
        } catch (e: Exception) {
            Log.e(tag, "Failed to init TextToSpeech", e)
        }
    }

    fun startListening() {
        _errorMessage.value = null
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            _errorMessage.value = "Speech recognition service is not available on this system. You can tap the voice command chips or type commands below."
            return
        }

        try {
            if (speechRecognizer == null) {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                    setRecognitionListener(createRecognitionListener())
                }
            }

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            }

            speechRecognizer?.startListening(intent)
            _isListening.value = true
        } catch (e: Exception) {
            Log.e(tag, "Error starting speech recognition", e)
            _isListening.value = false
            _errorMessage.value = "Could not start microphone: ${e.localizedMessage}"
        }
    }

    fun stopListening() {
        try {
            speechRecognizer?.stopListening()
        } catch (e: Exception) {
            Log.e(tag, "Error stopping speech recognition", e)
        } finally {
            _isListening.value = false
        }
    }

    private fun createRecognitionListener(): RecognitionListener {
        return object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                _isListening.value = true
                _errorMessage.value = null
            }

            override fun onBeginningOfSpeech() {
                _isListening.value = true
            }

            override fun onRmsChanged(rmsdB: Float) {}

            override fun onBufferReceived(buffer: ByteArray?) {}

            override fun onEndOfSpeech() {
                _isListening.value = false
            }

            override fun onError(error: Int) {
                _isListening.value = false
                val msg = when (error) {
                    SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                    SpeechRecognizer.ERROR_CLIENT -> "Speech recognition client error"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission required"
                    SpeechRecognizer.ERROR_NETWORK -> "Network error during recognition"
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                    SpeechRecognizer.ERROR_NO_MATCH -> "No command match heard. Try saying 'my cr no is 123' or 'request otp'."
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Speech service busy"
                    SpeechRecognizer.ERROR_SERVER -> "Recognition server error"
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech timeout. Tap mic to speak again."
                    else -> "Recognition error ($error)"
                }
                _errorMessage.value = msg
            }

            override fun onResults(results: Bundle?) {
                _isListening.value = false
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    val spokenText = matches[0]
                    processSpokenCommand(spokenText)
                }
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    _lastRecognizedText.value = matches[0]
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        }
    }

    fun processSpokenCommand(spokenText: String) {
        _lastRecognizedText.value = spokenText
        val action = VoiceCommandParser.parse(spokenText)

        when (action) {
            is VoiceAction.SetCrn -> {
                viewModel.crnInput.value = action.crn
                feedback("CRN updated to ${action.crn}")
            }
            is VoiceAction.SetEmail -> {
                viewModel.emailInput.value = action.email
                feedback("Email set to ${action.email}")
            }
            is VoiceAction.RequestOtp -> {
                feedback("Requesting Verification OTP...")
                viewModel.requestOtp()
            }
            is VoiceAction.SetOtp -> {
                viewModel.otpInput.value = action.otp
                feedback("OTP entered as ${action.otp}")
            }
            is VoiceAction.AutoFillOtp -> {
                feedback("Auto-filling demo OTP 1111...")
                viewModel.autoFillOtp()
            }
            is VoiceAction.VerifyOtp -> {
                feedback("Verifying OTP...")
                viewModel.verifyOtp()
            }
            is VoiceAction.BackToLoginStep1 -> {
                viewModel.loginStep.value = 1
                feedback("Back to CRN and Email step")
            }
            is VoiceAction.NextStep -> {
                val current = viewModel.activeApplication.value.currentStep
                if (current < 7) {
                    viewModel.goToStep(current + 1)
                    feedback("Advancing to Step ${current + 1}")
                } else {
                    feedback("Already at the final step")
                }
            }
            is VoiceAction.PreviousStep -> {
                val current = viewModel.activeApplication.value.currentStep
                if (current > 1) {
                    viewModel.goToStep(current - 1)
                    feedback("Returning to Step ${current - 1}")
                } else {
                    feedback("Already at Step 1")
                }
            }
            is VoiceAction.GoToStep -> {
                viewModel.goToStep(action.stepNumber)
                feedback("Jumped to Step ${action.stepNumber}")
            }
            is VoiceAction.ToggleRework -> {
                viewModel.toggleReworkMode()
                val isRework = viewModel.activeApplication.value.isReworkMode
                feedback(if (isRework) "Rework mode activated" else "Rework mode deactivated")
            }
            is VoiceAction.SubmitApplication -> {
                feedback("Submitting application...")
                viewModel.submitApplication()
            }
            is VoiceAction.SignOut -> {
                feedback("Signing out...")
                viewModel.signOutCustomer()
            }
            is VoiceAction.SwitchTab -> {
                viewModel.selectTab(action.tab)
                feedback("Switched to ${action.tab.name.lowercase().replace('_', ' ')}")
            }
            is VoiceAction.SetCompanyName -> {
                val current = viewModel.activeApplication.value.companyInfo
                viewModel.updateCompanyInfo(current.copy(companyName = action.name))
                feedback("Legal company name updated to ${action.name}")
            }
            is VoiceAction.SetTradeName -> {
                val current = viewModel.activeApplication.value.companyInfo
                viewModel.updateCompanyInfo(current.copy(tradeName = action.name))
                feedback("Trade name updated to ${action.name}")
            }
            is VoiceAction.Unknown -> {
                _errorMessage.value = "Command not recognized: \"${action.rawText}\". Try: 'my cr no is 123' or 'click on request verification otp'."
                speak("I did not recognize that command. Please try again.")
            }
        }
    }

    private fun feedback(message: String) {
        _lastFeedback.value = message
        _errorMessage.value = null
        viewModel.showToast(message)
        speak(message)
    }

    fun speak(text: String) {
        if (isTtsReady && textToSpeech != null) {
            try {
                textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "VoiceFeedback_${System.currentTimeMillis()}")
            } catch (e: Exception) {
                Log.e(tag, "TTS speak error", e)
            }
        }
    }

    fun destroy() {
        try {
            speechRecognizer?.destroy()
            speechRecognizer = null
            textToSpeech?.stop()
            textToSpeech?.shutdown()
            textToSpeech = null
        } catch (e: Exception) {
            Log.e(tag, "Error releasing resources", e)
        }
    }
}
