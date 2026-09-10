package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.AppView
import com.example.ui.BankViewModel
import com.example.ui.components.VoiceControlOverlay
import com.example.ui.theme.*
import com.example.voice.VoiceAssistantManager

@Composable
fun CustomerLoginScreen(
    viewModel: BankViewModel,
    voiceManager: VoiceAssistantManager? = null
) {
    val context = LocalContext.current
    val effectiveVoiceManager = voiceManager ?: remember { VoiceAssistantManager(context.applicationContext, viewModel) }

    val crn by viewModel.crnInput.collectAsState()
    val email by viewModel.emailInput.collectAsState()
    val otp by viewModel.otpInput.collectAsState()
    val step by viewModel.loginStep.collectAsState()
    val error by viewModel.loginError.collectAsState()
    val isLoggingIn by viewModel.isLoggingIn.collectAsState()
    val generatedOtp by viewModel.generatedOtp.collectAsState()
    val isVoiceControlEnabled by viewModel.isVoiceControlEnabled.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(FnbDarkBg)
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 480.dp)
                .verticalScroll(rememberScrollState()),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = FnbSurface),
            border = BorderStroke(1.dp, FnbBorder)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // FNB Logo Badge
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(FnbPrimaryVariant),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "FNB",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        letterSpacing = 1.5.sp
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Corporate Portal Access",
                    color = FnbTextPrimary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )

                Text(
                    text = "Enter your registration details to continue onboarding",
                    color = FnbTextSecondary,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                )

                // Voice Control Toggle Card
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isVoiceControlEnabled) Color(0xFF0C2738) else FnbCard,
                    border = BorderStroke(1.dp, if (isVoiceControlEnabled) FnbPrimary else FnbBorder),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(CircleShape)
                                    .background(if (isVoiceControlEnabled) FnbPrimary else FnbBorder),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (isVoiceControlEnabled) Icons.Default.Mic else Icons.Default.MicOff,
                                    contentDescription = "Voice Control",
                                    tint = if (isVoiceControlEnabled) FnbDarkBg else FnbTextSecondary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "Voice Controls",
                                        color = FnbTextPrimary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                    if (isVoiceControlEnabled) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = FnbSuccess.copy(alpha = 0.2f)
                                        ) {
                                            Text(
                                                text = "ACTIVE",
                                                color = FnbSuccess,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                            )
                                        }
                                    }
                                }
                                Text(
                                    text = if (isVoiceControlEnabled)
                                        "Say: 'my cr no is 123' or 'click on request verification otp'"
                                    else
                                        "Enable hands-free speech navigation & commands",
                                    color = FnbTextSecondary,
                                    fontSize = 11.sp,
                                    lineHeight = 14.sp
                                )
                            }
                        }
                        Switch(
                            checked = isVoiceControlEnabled,
                            onCheckedChange = { enabled ->
                                viewModel.toggleVoiceControl(enabled)
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = FnbPrimary,
                                checkedTrackColor = FnbPrimaryVariant
                            )
                        )
                    }
                }

                // Voice Control Overlay (When enabled)
                if (isVoiceControlEnabled) {
                    VoiceControlOverlay(
                        viewModel = viewModel,
                        voiceManager = effectiveVoiceManager,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }

                // Error alert box
                if (error != null) {
                    Surface(
                        color = FnbErrorBg,
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, FnbError),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = null,
                                tint = FnbError,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = error ?: "",
                                color = FnbTextPrimary,
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }

                if (step == 1) {
                    // STEP 1: CRN & Email
                    OutlinedTextField(
                        value = crn,
                        onValueChange = { viewModel.crnInput.value = it },
                        label = { Text("Commercial Registration No. (CRN)") },
                        placeholder = { Text("Enter CRN (e.g. 70291823)") },
                        leadingIcon = {
                            Icon(Icons.Default.Badge, contentDescription = null, tint = FnbPrimary)
                        },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = FnbPrimary,
                            unfocusedBorderColor = FnbBorder,
                            focusedTextColor = FnbTextPrimary,
                            unfocusedTextColor = FnbTextPrimary,
                            focusedContainerColor = FnbCard,
                            unfocusedContainerColor = FnbCard
                        )
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedTextField(
                        value = email,
                        onValueChange = { viewModel.emailInput.value = it },
                        label = { Text("Registered Email Address") },
                        placeholder = { Text("corporate@enterprise.com") },
                        leadingIcon = {
                            Icon(Icons.Default.Email, contentDescription = null, tint = FnbPrimary)
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = FnbPrimary,
                            unfocusedBorderColor = FnbBorder,
                            focusedTextColor = FnbTextPrimary,
                            unfocusedTextColor = FnbTextPrimary,
                            focusedContainerColor = FnbCard,
                            unfocusedContainerColor = FnbCard
                        )
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Supabase real-time validation indicator
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.CloudSync,
                                contentDescription = null,
                                tint = FnbSuccess,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Supabase Live DB Verified",
                                color = FnbSuccess,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        Text(
                            text = "RM Invitation Required",
                            color = FnbTextMuted,
                            fontSize = 11.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { viewModel.requestOtp() },
                        enabled = !isLoggingIn,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = FnbPrimary,
                            contentColor = FnbDarkBg
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        if (isLoggingIn) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = FnbDarkBg,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                text = "Request Verification OTP",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                    }
                } else {
                    // STEP 2: OTP Verification
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0x1F38BDF8),
                        border = BorderStroke(1.dp, Color(0x4038BDF8)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 18.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "We sent a 4-digit code to $email",
                                color = FnbTextPrimary,
                                fontSize = 12.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Key,
                                        contentDescription = null,
                                        tint = FnbPrimary,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "Access Code: ",
                                        color = FnbTextSecondary,
                                        fontSize = 12.sp
                                    )
                                    Text(
                                        text = "1111",
                                        color = FnbPrimary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                }
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = FnbPrimaryBg,
                                    border = BorderStroke(1.dp, FnbPrimary),
                                    modifier = Modifier.clickable { viewModel.autoFillOtp() }
                                ) {
                                    Text(
                                        text = "⚡ Auto-fill",
                                        color = FnbPrimary,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }
                        }
                    }

                    OutlinedTextField(
                        value = otp,
                        onValueChange = { if (it.length <= 4) viewModel.otpInput.value = it },
                        label = { Text("4-Digit OTP") },
                        placeholder = { Text("1111") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = FnbPrimary,
                            unfocusedBorderColor = FnbBorder,
                            focusedTextColor = FnbTextPrimary,
                            unfocusedTextColor = FnbTextPrimary,
                            focusedContainerColor = FnbCard,
                            unfocusedContainerColor = FnbCard
                        )
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    Button(
                        onClick = { viewModel.verifyOtp() },
                        enabled = !isLoggingIn,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = FnbPrimary,
                            contentColor = FnbDarkBg
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        if (isLoggingIn) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = FnbDarkBg,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                text = "Verify & Access Application",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    TextButton(
                        onClick = { viewModel.loginStep.value = 1 }
                    ) {
                        Text(
                            text = "← Back to CRN and Email",
                            color = FnbTextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
                HorizontalDivider(color = FnbBorder)
                Spacer(modifier = Modifier.height(14.dp))

                // RM Portal Link
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { viewModel.selectTab(com.example.ui.MobileTab.RM_SUITE) }
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.VpnKey,
                        contentDescription = null,
                        tint = FnbGold,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Relationship Manager (RM) Executive Portal",
                        color = FnbGold,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        tint = FnbGold,
                        modifier = Modifier.size(12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "© 2026 First National Bank. Member FDIC.",
                    color = FnbTextMuted,
                    fontSize = 10.sp
                )
            }
        }
    }
}
