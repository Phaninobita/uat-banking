package com.example.ui.components

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.ui.BankViewModel
import com.example.ui.theme.*
import com.example.voice.VoiceAssistantManager

@Composable
fun VoiceControlOverlay(
    viewModel: BankViewModel,
    voiceManager: VoiceAssistantManager,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val isListening by voiceManager.isListening.collectAsState()
    val lastRecognizedText by voiceManager.lastRecognizedText.collectAsState()
    val lastFeedback by voiceManager.lastFeedback.collectAsState()
    val errorMessage by voiceManager.errorMessage.collectAsState()

    var testInputText by remember { mutableStateOf("") }
    var isExpanded by remember { mutableStateOf(true) }

    // Permission launcher for audio recording
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            voiceManager.startListening()
        } else {
            viewModel.showToast("Microphone permission is needed for voice recognition.", isError = true)
        }
    }

    fun handleMicClick() {
        if (isListening) {
            voiceManager.stopListening()
        } else {
            val hasPermission = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED

            if (hasPermission) {
                voiceManager.startListening()
            } else {
                permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
        }
    }

    // Glowing animation when listening
    val infiniteTransition = rememberInfiniteTransition(label = "micPulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isListening) 1.25f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(700, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = FnbSurface,
        border = BorderStroke(1.5.dp, if (isListening) FnbPrimary else FnbPrimaryVariant),
        tonalElevation = 8.dp,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            // Header Bar: Status & Mic
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Pulsating Mic Button
                    Box(
                        modifier = Modifier
                            .size(42.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        if (isListening) {
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .scale(pulseScale)
                                    .clip(CircleShape)
                                    .background(FnbPrimary.copy(alpha = 0.35f))
                            )
                        }
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isListening) Brush.linearGradient(listOf(FnbPrimary, Color(0xFF0284C7)))
                                    else Brush.linearGradient(listOf(FnbCard, FnbBorder))
                                )
                                .clickable { handleMicClick() },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (isListening) Icons.Default.Mic else Icons.Default.MicNone,
                                contentDescription = if (isListening) "Stop Listening" else "Start Listening",
                                tint = if (isListening) FnbDarkBg else FnbPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = if (isListening) "Listening for commands..." else "Voice Control Active",
                                color = if (isListening) FnbPrimary else FnbTextPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = if (isListening) FnbSuccess.copy(alpha = 0.2f) else FnbPrimaryBg
                            ) {
                                Text(
                                    text = if (isListening) "LIVE MIC" else "TAP MIC TO SPEAK",
                                    color = if (isListening) FnbSuccess else FnbPrimary,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Text(
                            text = when {
                                lastFeedback != null -> "✓ $lastFeedback"
                                lastRecognizedText.isNotEmpty() -> "Heard: \"$lastRecognizedText\""
                                else -> "Say: 'my cr no is 123' or 'click on request verification otp'"
                            },
                            color = if (lastFeedback != null) FnbSuccess else FnbTextSecondary,
                            fontSize = 11.sp,
                            maxLines = 1
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { isExpanded = !isExpanded },
                        modifier = Modifier.size(30.dp)
                    ) {
                        Icon(
                            imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                            contentDescription = "Toggle Expand",
                            tint = FnbTextSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    IconButton(
                        onClick = {
                            voiceManager.stopListening()
                            viewModel.toggleVoiceControl(false)
                        },
                        modifier = Modifier.size(30.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close Voice Control",
                            tint = FnbTextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // Expanded Controls: Prompts & Simulator
            AnimatedVisibility(visible = isExpanded) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Error Notice if Any
                    if (errorMessage != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = FnbErrorBg,
                            border = BorderStroke(1.dp, FnbError)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(Icons.Default.Info, contentDescription = null, tint = FnbError, modifier = Modifier.size(14.dp))
                                Text(
                                    text = errorMessage ?: "",
                                    color = FnbTextPrimary,
                                    fontSize = 11.sp,
                                    lineHeight = 14.sp
                                )
                            }
                        }
                    }

                    // Quick Command Chips (Tap to speak or simulate immediately!)
                    Text(
                        text = "Quick Voice Prompts (Tap or Speak):",
                        color = FnbTextSecondary,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold
                    )

                    val samplePrompts = listOf(
                        "my cr no is 123",
                        "my cr no is 509077205",
                        "click on request verification otp",
                        "my otp is 1111",
                        "auto fill otp",
                        "click on verify otp",
                        "next step",
                        "previous step",
                        "go to step 3",
                        "simulate rework",
                        "submit application"
                    )

                    LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(samplePrompts) { prompt ->
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = FnbCard,
                                border = BorderStroke(1.dp, FnbBorder),
                                modifier = Modifier.clickable {
                                    voiceManager.processSpokenCommand(prompt)
                                }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(text = "🗣", fontSize = 11.sp)
                                    Text(
                                        text = prompt,
                                        color = FnbTextPrimary,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }

                    // Test Voice Input Text Field (Perfect for emulator / silent testing)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = testInputText,
                            onValueChange = { testInputText = it },
                            placeholder = { Text("Speak or type command (e.g. 'my cr no is 123')", fontSize = 11.sp) },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = FnbPrimary,
                                unfocusedBorderColor = FnbBorder,
                                focusedTextColor = FnbTextPrimary,
                                unfocusedTextColor = FnbTextPrimary,
                                focusedContainerColor = FnbCard,
                                unfocusedContainerColor = FnbCard
                            )
                        )
                        Button(
                            onClick = {
                                if (testInputText.isNotBlank()) {
                                    voiceManager.processSpokenCommand(testInputText)
                                    testInputText = ""
                                }
                            },
                            enabled = testInputText.isNotBlank(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = FnbPrimary,
                                contentColor = FnbDarkBg
                            ),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Icon(Icons.Default.Send, contentDescription = "Run Command", modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
    }
}
